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
import { PrismaOverviewRepository } from "@/server/analytics/overview.repository";
import { OverviewService } from "@/server/analytics/overview.service";
import { metricsRegistry } from "@/server/metrics/registry";
import { PrometheusFunnelMetrics } from "@/server/metrics/prometheus-funnel-metrics";
import { LastNonDirectTouch } from "@/server/tracking/attribution/attribution-model";
import { EventIngestionService } from "@/server/tracking/event-ingestion.service";
import { PrismaFunnelRepository } from "@/server/tracking/funnel/funnel.repository";
import { FunnelService } from "@/server/tracking/funnel/funnel.service";
import { TouchClassifier } from "@/server/tracking/touch/touch-classifier";
import { PrismaTrackingRepository } from "@/server/tracking/tracking.repository";
import { VisitorResolver } from "@/server/tracking/visitor-resolver";

// Composition root: the only place that knows about concrete implementations.
const passwordHasher = new BcryptPasswordHasher();
const tokenService = new RandomTokenService();
const userRepository = new PrismaUserRepository(db);
const companyRepository = new PrismaCompanyRepository(db);
const memberRepository = new PrismaMemberRepository(db);
const invitationRepository = new PrismaInvitationRepository(db);
const trackingRepository = new PrismaTrackingRepository(db);

export const userDirectory = userRepository;
export const credentialsAuthenticator = new CredentialsAuthenticator(userRepository, passwordHasher);
export const registrationService = new RegistrationService(userRepository, companyRepository, passwordHasher);
export const teamService = new TeamService(memberRepository, invitationRepository, userRepository, tokenService, new TeamPolicy());
export const invitationAcceptanceService = new InvitationAcceptanceService(invitationRepository, userRepository, tokenService, passwordHasher);

export const eventIngestionService = new EventIngestionService(
  trackingRepository,
  new VisitorResolver(trackingRepository),
  new TouchClassifier(),
  new LastNonDirectTouch(),
  new PrometheusFunnelMetrics(metricsRegistry),
);
const funnelRepository = new PrismaFunnelRepository(db);
export const funnelService = new FunnelService(funnelRepository);
export const overviewService = new OverviewService(new PrismaOverviewRepository(db), funnelRepository);
export { metricsRegistry };
