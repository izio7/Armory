import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import { AccountService } from './account.service';
import { JhiTrackerService } from '../tracker/tracker.service'; // Barrel doesnt work here. No idea why!

@Injectable()
export class Principal {
    private _identity: any;
    private authenticated = false;
    private authenticationState = new Subject<any>();

    constructor(
        private account: AccountService,
        private trackerService: JhiTrackerService
    ) {}

    authenticate (_identity) {
        this._identity = _identity;
        this.authenticated = _identity !== null;
    }

    hasAnyAuthority (authorities) {
        if (!this.authenticated || !this._identity || !this._identity.authorities) {
            return false;
        }

        for (let i = 0; i < authorities.length; i++) {
            if (this._identity.authorities.indexOf(authorities[i]) !== -1) {
                return true;
            }
        }

        return false;
    }

    hasAuthority (authority): Promise<any> {
        if (!this.authenticated) {
           return Promise.resolve(false);
        }

        return this.identity().then(id => {
            return id.authorities && id.authorities.indexOf(authority) !== -1;
        }, () => {
            return false;
        });
    }

    identity (force?: boolean): Promise<any> {
        if (force === true) {
            this._identity = undefined;
        }

        // check and see if we have retrieved the _identity data from the server.
        // if we have, reuse it by immediately resolving
        if (this._identity) {
            return Promise.resolve(this._identity);
        }

        // retrieve the _identity data from the server, update the _identity object, and then resolve.
        return this.account.get().toPromise().then(account => {
            if (account) {
                this._identity = account;
                this.authenticated = true;
                this.trackerService.connect();
            } else {
                this._identity = null;
                this.authenticated = false;
            }
            this.authenticationState.next(this._identity);
            return this._identity;
        }).catch(err => {
            if (this.trackerService.stompClient && this.trackerService.stompClient.connected) {
                this.trackerService.disconnect();
            }
            this._identity = null;
            this.authenticated = false;
            this.authenticationState.next(this._identity);
            return null;
        });
    }

    isAuthenticated (): boolean {
        return this.authenticated;
    }

    isIdentityResolved (): boolean {
        return this._identity !== undefined;
    }

    getAuthenticationState(): Observable<any> {
        return this.authenticationState.asObservable();
    }

    getImageUrl(): String {
        return this.isIdentityResolved () ? this._identity.imageUrl : null;
    }
}
