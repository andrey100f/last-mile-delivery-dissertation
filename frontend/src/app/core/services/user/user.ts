import {Injectable, signal} from '@angular/core';
import {User} from '@core/services/enum/user.types';
import {Observable, tap} from 'rxjs';
import {BaseService} from '@core/services/base.service';

@Injectable({
  providedIn: 'root',
})
export class UserService extends BaseService {
  private readonly _id = '6fa506dc-70bf-40bb-8e9f-975df704f527'
  private readonly _currentUserInfo = signal<User | null>(null);

  readonly currentUser = this._currentUserInfo.asReadonly();

  private readonly _user$ = this._getById().pipe(
    tap((user: User | null) => {this._currentUserInfo.set(user)})
  );

  public ensureLoaded() {
    return this._user$;
  }

  private _getById(): Observable<User> {
    return this.httpClient.get<User>(`${this.baseUrl}/users/${this._id}`);
  }
}
