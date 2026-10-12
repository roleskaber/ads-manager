import "server-only";
import { db } from "@/lib/db";
import { BcryptPasswordHasher } from "@/lib/security/password-hasher";
import { RandomTokenService } from "@/lib/security/token";
import { CredentialsAuthenticator } from "@/server/auth/credentials-authenticator";
import { RegistrationService } from "@/server/auth/registration.service";
import { PrismaCompanyRepository } from "@/server/companies/company.repository";
import { InvitationAcceptanceService } from "@/server/team/invitation-acceptance.service";
import { PrismaInvitationRepository } from "@/server/team/invitation.repository";
import { PrismaMemberRepository } from "@/server/team/member.repository";
import { TeamPolicy } from "@/server/team/team-policy";
import { TeamService } from "@/server/team/team.service";
import { PrismaUserRepository } from "@/server/users/user.repository";

// Composition root: the only place that knows about concrete implementations.
const passwordHasher = new BcryptPasswordHasher();
const tokenService = new RandomTokenService();
const userRepository = new PrismaUserRepository(db);
const companyRepository = new PrismaCompanyRepository(db);
const memberRepository = new PrismaMemberRepository(db);
const invitationRepository = new PrismaInvitationRepository(db);

export const userDirectory = userRepository;
export const credentialsAuthenticator = new CredentialsAuthenticator(userRepository, passwordHasher);
export const registrationService = new RegistrationService(userRepository, companyRepository, passwordHasher);
export const teamService = new TeamService(memberRepository, invitationRepository, userRepository, tokenService, new TeamPolicy());
export const invitationAcceptanceService = new InvitationAcceptanceService(invitationRepository, userRepository, tokenService, passwordHasher);
