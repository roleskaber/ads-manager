export type TeamErrorCode =
  | "forbidden"
  | "notFound"
  | "alreadyMember"
  | "invitationInvalid"
  | "invitationExpired";

export class TeamError extends Error {
  constructor(readonly code: TeamErrorCode) {
    super(code);
  }
}
