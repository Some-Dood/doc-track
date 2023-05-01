import { Document } from '../../../model/src/document.ts';
import { Invitation } from '../../../model/src/invitation.ts';
import { Staff } from '../../../model/src/staff.ts';
import { User } from '../../../model/src/user.ts';

export enum MetricsMode {
    User,
    Local,
    Global,
}

export enum IconColor {
    Default = 'default',
    White = 'white'
}

export enum IconSize {
    Normal = 'normal',
    Medium = 'medium',
    Large = 'large',
}

export enum ButtonType {
    Primary = 'primary',
    Secondary = 'secondary',
    Danger = 'danger',
}

export enum InputType {
    Text = 'text',
    Password = 'password',
    Number = 'number',
}

export enum RowType {
    AcceptDocument,
    Inbox,
    Invite,
    Person,
}

export enum Events {
    OverflowClick = 'overflowClick',
    AcceptDocument = 'acceptDocument',
    DeclineDocument = 'declineDocument',
    Camera = 'toggleCamera',
    SendDocument = 'sendDocument',
    TerminateDocument = 'terminateDocument',
    CreateInvitation = 'createInvitation',
    RemoveInvitation = 'removeInvitation',
    ShowUserInfo = 'showUserInfo',
    DeleteUser = 'deleteUser',
    EditUser = 'editUser',
    RowContainerClick = 'rowContainerClick',
}

export interface ContextPayload {
    ty: RowType.AcceptDocument | RowType.Inbox;
    id: Document['id'];
}

export interface InvitePayload {
    ty: RowType.Invite;
    email: Invitation['email'];
    office: Invitation['office'];
}

export interface PersonPayload {
    ty: RowType.Person;
    id: Staff['user_id'];
    office: Staff['office'];
}

export interface GlobalPersonPayload {
    ty: RowType.Person;
    id: User['id'];
}
