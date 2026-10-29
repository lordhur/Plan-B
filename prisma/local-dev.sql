-- DDL généré par scripts/db-push.ts (dev local)
CREATE TABLE "_InterestToUser" (
  "A" text NOT NULL,
  "B" text NOT NULL,
  PRIMARY KEY ("A", "B")
);
CREATE TABLE "_EventCategoryToUser" (
  "A" text NOT NULL,
  "B" text NOT NULL,
  PRIMARY KEY ("A", "B")
);
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'NON_BINARY', 'OTHER', 'PREFER_NOT_TO_SAY');
CREATE TYPE "Orientation" AS ENUM ('HETEROSEXUAL', 'HOMOSEXUAL', 'BISEXUAL', 'OTHER');
CREATE TYPE "PrivacyLevel" AS ENUM ('PUBLIC', 'FRIENDS_OF_FRIENDS', 'FRIENDS_ONLY', 'PRIVATE');
CREATE TYPE "MessagePermission" AS ENUM ('EVERYONE', 'FRIENDS_OF_FRIENDS', 'FRIENDS_ONLY', 'NOBODY');
CREATE TYPE "VerificationType" AS ENUM ('EMAIL_VERIFICATION', 'PHONE_VERIFICATION', 'PASSWORD_RESET');
CREATE TYPE "BadgeCategory" AS ENUM ('TRUST', 'ORGANIZER', 'PARTICIPANT', 'SOCIAL', 'CATEGORY', 'SPECIAL');
CREATE TYPE "FriendRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'BLOCKED');
CREATE TYPE "MeetupVisibility" AS ENUM ('EVERYONE', 'MEMBERS', 'SCHEDULED');
CREATE TYPE "RegistrationType" AS ENUM ('OPEN', 'APPROVAL_REQUIRED', 'INVITATION_ONLY');
CREATE TYPE "GenderRestriction" AS ENUM ('ALL', 'MALE_ONLY', 'FEMALE_ONLY', 'NON_BINARY_ONLY');
CREATE TYPE "EventVisibility" AS ENUM ('PUBLIC', 'FRIENDS_ONLY', 'PRIVATE', 'UNLISTED');
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED');
CREATE TYPE "ParticipationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DECLINED', 'CANCELLED', 'ATTENDED', 'NO_SHOW');
CREATE TYPE "StoryType" AS ENUM ('PHOTO', 'VIDEO');
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO', 'AUDIO', 'FILE');
CREATE TYPE "ReportReason" AS ENUM ('HARASSMENT', 'INAPPROPRIATE_BEHAVIOR', 'NO_SHOW', 'FAKE_PROFILE', 'SPAM', 'VIOLENCE', 'OTHER');
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'INVESTIGATING', 'RESOLVED', 'DISMISSED');
CREATE TYPE "CarpoolStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED');
CREATE TYPE "GroupRole" AS ENUM ('ADMIN', 'MODERATOR', 'MEMBER');
CREATE TYPE "PartnerType" AS ENUM ('LOCAL_BUSINESS', 'BRAND', 'ORGANIZATION', 'VENUE');
CREATE TYPE "SubscriptionPlan" AS ENUM ('FREE', 'ORGANIZER_PRO', 'PREMIUM', 'BUSINESS');
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELLED', 'UNPAID');
CREATE TYPE "LeaderboardPeriod" AS ENUM ('WEEKLY', 'MONTHLY', 'ALL_TIME');
CREATE TYPE "LeaderboardScope" AS ENUM ('NATIONAL', 'REGIONAL', 'DEPARTMENTAL', 'CITY');
CREATE TYPE "NotificationType" AS ENUM ('EVENT_INVITATION', 'EVENT_UPDATE', 'EVENT_CANCELLED', 'EVENT_REMINDER', 'EVENT_LOCATION_CHANGE', 'EVENT_FULL', 'EVENT_NEW_PARTICIPANT', 'EVENT_PARTICIPANT_LEFT', 'PARTICIPATION_APPROVED', 'PARTICIPATION_DECLINED', 'WAITLIST_PROMOTED', 'FRIEND_REQUEST', 'FRIEND_ACCEPTED', 'MESSAGE_RECEIVED', 'RATING_RECEIVED', 'BADGE_EARNED', 'PAGE_NEW_EVENT', 'CARPOOL_REQUEST', 'CARPOOL_ACCEPTED', 'GROUP_NEW_POST', 'PARTNER_OFFER', 'SYSTEM');
CREATE TABLE "User" (
  "id" text NOT NULL PRIMARY KEY,
  "email" text NOT NULL,
  "emailVerified" boolean NOT NULL DEFAULT false,
  "phone" text,
  "phoneVerified" boolean NOT NULL DEFAULT false,
  "passwordHash" text NOT NULL,
  "firstName" text NOT NULL,
  "lastName" text NOT NULL,
  "displayName" text,
  "dateOfBirth" timestamp(3) NOT NULL,
  "gender" "Gender" NOT NULL,
  "orientation" "Orientation",
  "bio" text,
  "profession" text,
  "education" text,
  "city" text,
  "latitude" double precision,
  "longitude" double precision,
  "avatarUrl" text,
  "coverImage" text,
  "lastSeenAt" timestamp(3),
  "videoUrl" text,
  "instagram" text,
  "tiktok" text,
  "youtube" text,
  "spotify" text,
  "privacyLevel" "PrivacyLevel" NOT NULL DEFAULT 'PUBLIC'::"PrivacyLevel",
  "allowMessagesFrom" "MessagePermission" NOT NULL DEFAULT 'EVERYONE'::"MessagePermission",
  "allowFriendRequests" boolean NOT NULL DEFAULT true,
  "showAge" boolean NOT NULL DEFAULT true,
  "showLastName" boolean NOT NULL DEFAULT false,
  "averageRating" double precision NOT NULL DEFAULT 5,
  "totalRatings" integer NOT NULL DEFAULT 0,
  "trustScore" integer NOT NULL DEFAULT 50,
  "eventsCreated" integer NOT NULL DEFAULT 0,
  "eventsAttended" integer NOT NULL DEFAULT 0,
  "friendCount" integer NOT NULL DEFAULT 0,
  "isActive" boolean NOT NULL DEFAULT true,
  "isBanned" boolean NOT NULL DEFAULT false,
  "banReason" text,
  "lastActiveAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL,
  CONSTRAINT "User_email_key" UNIQUE ("email"),
  CONSTRAINT "User_phone_key" UNIQUE ("phone")
);
CREATE TABLE "ProfilePhoto" (
  "id" text NOT NULL PRIMARY KEY,
  "userId" text NOT NULL,
  "url" text NOT NULL,
  "isPrimary" boolean NOT NULL DEFAULT false,
  "order" integer NOT NULL DEFAULT 0,
  "source" text NOT NULL DEFAULT 'upload',
  "albumId" text,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "PhotoAlbum" (
  "id" text NOT NULL PRIMARY KEY,
  "userId" text NOT NULL,
  "name" text NOT NULL,
  "coverUrl" text,
  "isPublic" boolean NOT NULL DEFAULT true,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "ConnectedAccount" (
  "id" text NOT NULL PRIMARY KEY,
  "userId" text NOT NULL,
  "provider" text NOT NULL,
  "providerUserId" text NOT NULL,
  "email" text,
  "accessToken" text,
  "refreshToken" text,
  "expiresAt" timestamp(3),
  "photosSyncedAt" timestamp(3),
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("provider", "providerUserId"),
  CONSTRAINT "ConnectedAccount_provider_providerUserId_key" UNIQUE ("provider", "providerUserId")
);
CREATE TABLE "VerificationCode" (
  "id" text NOT NULL PRIMARY KEY,
  "userId" text,
  "target" text NOT NULL,
  "codeHash" text NOT NULL,
  "type" "VerificationType" NOT NULL,
  "expiresAt" timestamp(3) NOT NULL,
  "attempts" integer NOT NULL DEFAULT 0,
  "consumedAt" timestamp(3),
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "Interest" (
  "id" text NOT NULL PRIMARY KEY,
  "name" text NOT NULL,
  "icon" text,
  CONSTRAINT "Interest_name_key" UNIQUE ("name")
);
CREATE TABLE "Badge" (
  "id" text NOT NULL PRIMARY KEY,
  "code" text NOT NULL,
  "name" text NOT NULL,
  "description" text NOT NULL,
  "icon" text NOT NULL,
  "color" text NOT NULL,
  "category" "BadgeCategory" NOT NULL,
  "criteria" jsonb NOT NULL,
  CONSTRAINT "Badge_code_key" UNIQUE ("code")
);
CREATE TABLE "UserBadge" (
  "id" text NOT NULL PRIMARY KEY,
  "userId" text NOT NULL,
  "badgeId" text NOT NULL,
  "earnedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("userId", "badgeId"),
  CONSTRAINT "UserBadge_userId_badgeId_key" UNIQUE ("userId", "badgeId")
);
CREATE TABLE "FriendRequest" (
  "id" text NOT NULL PRIMARY KEY,
  "senderId" text NOT NULL,
  "receiverId" text NOT NULL,
  "status" "FriendRequestStatus" NOT NULL DEFAULT 'PENDING'::"FriendRequestStatus",
  "message" text,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL,
  UNIQUE ("senderId", "receiverId"),
  CONSTRAINT "FriendRequest_senderId_receiverId_key" UNIQUE ("senderId", "receiverId")
);
CREATE TABLE "Friendship" (
  "id" text NOT NULL PRIMARY KEY,
  "userAId" text NOT NULL,
  "userBId" text NOT NULL,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("userAId", "userBId"),
  CONSTRAINT "Friendship_userAId_userBId_key" UNIQUE ("userAId", "userBId")
);
CREATE TABLE "EventLike" (
  "id" text NOT NULL PRIMARY KEY,
  "eventId" text NOT NULL,
  "userId" text NOT NULL,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("eventId", "userId"),
  CONSTRAINT "EventLike_eventId_userId_key" UNIQUE ("eventId", "userId")
);
CREATE TABLE "EventCategory" (
  "id" text NOT NULL PRIMARY KEY,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "icon" text NOT NULL,
  "color" text NOT NULL,
  CONSTRAINT "EventCategory_name_key" UNIQUE ("name"),
  CONSTRAINT "EventCategory_slug_key" UNIQUE ("slug")
);
CREATE TABLE "Event" (
  "id" text NOT NULL PRIMARY KEY,
  "slug" text NOT NULL,
  "shareToken" text NOT NULL,
  "organizerId" text NOT NULL,
  "pageId" text,
  "title" text NOT NULL,
  "description" text NOT NULL,
  "shortDescription" text,
  "meetupAddress" text,
  "meetupVisibility" "MeetupVisibility" NOT NULL DEFAULT 'EVERYONE'::"MeetupVisibility",
  "meetupRevealAt" timestamp(3),
  "coverImage" text,
  "categoryId" text NOT NULL,
  "tags" text[] NOT NULL,
  "startDate" timestamp(3) NOT NULL,
  "endDate" timestamp(3),
  "timezone" text NOT NULL DEFAULT 'Europe/Paris',
  "locationName" text NOT NULL,
  "address" text NOT NULL,
  "city" text NOT NULL,
  "zipCode" text,
  "latitude" double precision NOT NULL,
  "longitude" double precision NOT NULL,
  "isOnline" boolean NOT NULL DEFAULT false,
  "onlineLink" text,
  "maxParticipants" integer,
  "minParticipants" integer DEFAULT 1,
  "currentParticipants" integer NOT NULL DEFAULT 0,
  "registrationType" "RegistrationType" NOT NULL DEFAULT 'OPEN'::"RegistrationType",
  "minAge" integer,
  "maxAge" integer,
  "genderRestriction" "GenderRestriction" NOT NULL DEFAULT 'ALL'::"GenderRestriction",
  "minRating" double precision,
  "wheelchairAccessible" boolean NOT NULL DEFAULT false,
  "hearingAccessible" boolean NOT NULL DEFAULT false,
  "visuallyAccessible" boolean NOT NULL DEFAULT false,
  "accessibilityNotes" text,
  "visibility" "EventVisibility" NOT NULL DEFAULT 'PUBLIC'::"EventVisibility",
  "isCollaborative" boolean NOT NULL DEFAULT false,
  "isFree" boolean NOT NULL DEFAULT true,
  "price" double precision DEFAULT 0,
  "currency" text NOT NULL DEFAULT 'EUR',
  "stripePriceId" text,
  "platformFeePercent" double precision NOT NULL DEFAULT 5,
  "isSponsored" boolean NOT NULL DEFAULT false,
  "sponsorId" text,
  "status" "EventStatus" NOT NULL DEFAULT 'UPCOMING'::"EventStatus",
  "cancelReason" text,
  "lastLocationUpdate" timestamp(3),
  "lastUpdate" text,
  "viewCount" integer NOT NULL DEFAULT 0,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL,
  CONSTRAINT "Event_slug_key" UNIQUE ("slug"),
  CONSTRAINT "Event_shareToken_key" UNIQUE ("shareToken")
);
CREATE TABLE "EventCollaborator" (
  "id" text NOT NULL PRIMARY KEY,
  "eventId" text NOT NULL,
  "userId" text NOT NULL,
  "role" text NOT NULL DEFAULT 'co-organizer',
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("eventId", "userId"),
  CONSTRAINT "EventCollaborator_eventId_userId_key" UNIQUE ("eventId", "userId")
);
CREATE TABLE "EventParticipation" (
  "id" text NOT NULL PRIMARY KEY,
  "eventId" text NOT NULL,
  "userId" text NOT NULL,
  "status" "ParticipationStatus" NOT NULL DEFAULT 'CONFIRMED'::"ParticipationStatus",
  "joinedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ticketId" text,
  "paymentId" text,
  "amountPaid" double precision,
  "hasRated" boolean NOT NULL DEFAULT false,
  CONSTRAINT "EventParticipation_ticketId_key" UNIQUE ("ticketId"),
  UNIQUE ("eventId", "userId"),
  CONSTRAINT "EventParticipation_eventId_userId_key" UNIQUE ("eventId", "userId")
);
CREATE TABLE "Story" (
  "id" text NOT NULL PRIMARY KEY,
  "authorId" text NOT NULL,
  "mediaUrl" text NOT NULL,
  "type" "StoryType" NOT NULL DEFAULT 'PHOTO'::"StoryType",
  "caption" text,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "SavedStory" (
  "id" text NOT NULL PRIMARY KEY,
  "userId" text NOT NULL,
  "storyId" text NOT NULL,
  "order" integer NOT NULL DEFAULT 0,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("userId", "storyId"),
  CONSTRAINT "SavedStory_userId_storyId_key" UNIQUE ("userId", "storyId")
);
CREATE TABLE "StoryLike" (
  "id" text NOT NULL PRIMARY KEY,
  "storyId" text NOT NULL,
  "userId" text NOT NULL,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("storyId", "userId"),
  CONSTRAINT "StoryLike_storyId_userId_key" UNIQUE ("storyId", "userId")
);
CREATE TABLE "WaitlistEntry" (
  "id" text NOT NULL PRIMARY KEY,
  "eventId" text NOT NULL,
  "userId" text NOT NULL,
  "position" integer NOT NULL,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("eventId", "userId"),
  CONSTRAINT "WaitlistEntry_eventId_userId_key" UNIQUE ("eventId", "userId")
);
CREATE TABLE "EventInvitation" (
  "id" text NOT NULL PRIMARY KEY,
  "eventId" text NOT NULL,
  "userId" text NOT NULL,
  "invitedBy" text NOT NULL,
  "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING'::"InvitationStatus",
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("eventId", "userId"),
  CONSTRAINT "EventInvitation_eventId_userId_key" UNIQUE ("eventId", "userId")
);
CREATE TABLE "EventChatMessage" (
  "id" text NOT NULL PRIMARY KEY,
  "eventId" text NOT NULL,
  "userId" text NOT NULL,
  "content" text NOT NULL,
  "mediaUrl" text,
  "mediaType" "MediaType",
  "isSystem" boolean NOT NULL DEFAULT false,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "editedAt" timestamp(3),
  "isDeleted" boolean NOT NULL DEFAULT false
);
CREATE TABLE "Conversation" (
  "id" text NOT NULL PRIMARY KEY,
  "name" text,
  "isGroup" boolean NOT NULL DEFAULT false,
  "avatarUrl" text,
  "ephemeralHours" integer,
  "theme" text,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL
);
CREATE TABLE "ConversationMember" (
  "id" text NOT NULL PRIMARY KEY,
  "conversationId" text NOT NULL,
  "userId" text NOT NULL,
  "role" text NOT NULL DEFAULT 'member',
  "joinedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastReadAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deliveredAt" timestamp(3),
  "isMuted" boolean NOT NULL DEFAULT false,
  "mutedUntil" timestamp(3),
  "hiddenAt" timestamp(3),
  UNIQUE ("conversationId", "userId"),
  CONSTRAINT "ConversationMember_conversationId_userId_key" UNIQUE ("conversationId", "userId")
);
CREATE TABLE "MessageHide" (
  "id" text NOT NULL PRIMARY KEY,
  "messageId" text NOT NULL,
  "userId" text NOT NULL,
  UNIQUE ("messageId", "userId"),
  CONSTRAINT "MessageHide_messageId_userId_key" UNIQUE ("messageId", "userId")
);
CREATE TABLE "UserBlock" (
  "id" text NOT NULL PRIMARY KEY,
  "blockerId" text NOT NULL,
  "blockedId" text NOT NULL,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("blockerId", "blockedId"),
  CONSTRAINT "UserBlock_blockerId_blockedId_key" UNIQUE ("blockerId", "blockedId")
);
CREATE TABLE "DirectMessage" (
  "id" text NOT NULL PRIMARY KEY,
  "conversationId" text NOT NULL,
  "senderId" text NOT NULL,
  "receiverId" text,
  "content" text NOT NULL,
  "mediaUrl" text,
  "mediaType" "MediaType",
  "mediaName" text,
  "isRead" boolean NOT NULL DEFAULT false,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "editedAt" timestamp(3),
  "isDeleted" boolean NOT NULL DEFAULT false
);
CREATE TABLE "EventAlbum" (
  "id" text NOT NULL PRIMARY KEY,
  "eventId" text NOT NULL,
  "isLocked" boolean NOT NULL DEFAULT false,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EventAlbum_eventId_key" UNIQUE ("eventId")
);
CREATE TABLE "Media" (
  "id" text NOT NULL PRIMARY KEY,
  "albumId" text NOT NULL,
  "uploaderId" text NOT NULL,
  "url" text NOT NULL,
  "thumbnailUrl" text,
  "type" "MediaType" NOT NULL,
  "caption" text,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "MediaIdentification" (
  "id" text NOT NULL PRIMARY KEY,
  "mediaId" text NOT NULL,
  "userId" text NOT NULL,
  "taggedBy" text NOT NULL,
  "confirmed" boolean NOT NULL DEFAULT false,
  "positionX" double precision,
  "positionY" double precision,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("mediaId", "userId"),
  CONSTRAINT "MediaIdentification_mediaId_userId_key" UNIQUE ("mediaId", "userId")
);
CREATE TABLE "UserRating" (
  "id" text NOT NULL PRIMARY KEY,
  "fromId" text NOT NULL,
  "toId" text NOT NULL,
  "eventId" text NOT NULL,
  "rating" integer NOT NULL,
  "comment" text,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("fromId", "toId", "eventId"),
  CONSTRAINT "UserRating_fromId_toId_eventId_key" UNIQUE ("fromId", "toId", "eventId")
);
CREATE TABLE "Report" (
  "id" text NOT NULL PRIMARY KEY,
  "reporterId" text NOT NULL,
  "reportedId" text NOT NULL,
  "eventId" text,
  "reason" "ReportReason" NOT NULL,
  "description" text,
  "status" "ReportStatus" NOT NULL DEFAULT 'PENDING'::"ReportStatus",
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" timestamp(3)
);
CREATE TABLE "CarpoolOffer" (
  "id" text NOT NULL PRIMARY KEY,
  "eventId" text NOT NULL,
  "driverId" text NOT NULL,
  "departurePoint" text NOT NULL,
  "departureLatitude" double precision NOT NULL,
  "departureLongitude" double precision NOT NULL,
  "departureTime" timestamp(3) NOT NULL,
  "availableSeats" integer NOT NULL,
  "pricePerSeat" double precision NOT NULL DEFAULT 0,
  "notes" text,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "CarpoolRequest" (
  "id" text NOT NULL PRIMARY KEY,
  "offerId" text NOT NULL,
  "passengerId" text NOT NULL,
  "status" "CarpoolStatus" NOT NULL DEFAULT 'PENDING'::"CarpoolStatus",
  "seatsRequested" integer NOT NULL DEFAULT 1,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("offerId", "passengerId"),
  CONSTRAINT "CarpoolRequest_offerId_passengerId_key" UNIQUE ("offerId", "passengerId")
);
CREATE TABLE "Page" (
  "id" text NOT NULL PRIMARY KEY,
  "ownerId" text NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "description" text,
  "category" text NOT NULL,
  "avatarUrl" text,
  "coverUrl" text,
  "address" text,
  "city" text,
  "latitude" double precision,
  "longitude" double precision,
  "phone" text,
  "website" text,
  "email" text,
  "isVerified" boolean NOT NULL DEFAULT false,
  "followerCount" integer NOT NULL DEFAULT 0,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL,
  CONSTRAINT "Page_slug_key" UNIQUE ("slug")
);
CREATE TABLE "PageFollow" (
  "id" text NOT NULL PRIMARY KEY,
  "pageId" text NOT NULL,
  "userId" text NOT NULL,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("pageId", "userId"),
  CONSTRAINT "PageFollow_pageId_userId_key" UNIQUE ("pageId", "userId")
);
CREATE TABLE "InterestGroup" (
  "id" text NOT NULL PRIMARY KEY,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "description" text,
  "coverImage" text,
  "category" text NOT NULL,
  "city" text,
  "latitude" double precision,
  "longitude" double precision,
  "isPrivate" boolean NOT NULL DEFAULT false,
  "memberCount" integer NOT NULL DEFAULT 0,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InterestGroup_slug_key" UNIQUE ("slug")
);
CREATE TABLE "GroupMember" (
  "id" text NOT NULL PRIMARY KEY,
  "groupId" text NOT NULL,
  "userId" text NOT NULL,
  "role" "GroupRole" NOT NULL DEFAULT 'MEMBER'::"GroupRole",
  "joinedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("groupId", "userId"),
  CONSTRAINT "GroupMember_groupId_userId_key" UNIQUE ("groupId", "userId")
);
CREATE TABLE "ForumPost" (
  "id" text NOT NULL PRIMARY KEY,
  "groupId" text NOT NULL,
  "authorId" text NOT NULL,
  "title" text NOT NULL,
  "content" text NOT NULL,
  "isPinned" boolean NOT NULL DEFAULT false,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL
);
CREATE TABLE "ForumReply" (
  "id" text NOT NULL PRIMARY KEY,
  "postId" text NOT NULL,
  "authorId" text NOT NULL,
  "content" text NOT NULL,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL
);
CREATE TABLE "Partner" (
  "id" text NOT NULL PRIMARY KEY,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "description" text,
  "logoUrl" text,
  "type" "PartnerType" NOT NULL,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Partner_slug_key" UNIQUE ("slug")
);
CREATE TABLE "PartnerOffer" (
  "id" text NOT NULL PRIMARY KEY,
  "partnerId" text NOT NULL,
  "pageId" text,
  "title" text NOT NULL,
  "description" text NOT NULL,
  "discountPercent" double precision,
  "discountCode" text,
  "validFrom" timestamp(3) NOT NULL,
  "validUntil" timestamp(3) NOT NULL,
  "maxRedemptions" integer,
  "currentRedemptions" integer NOT NULL DEFAULT 0,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "RedeemedOffer" (
  "id" text NOT NULL PRIMARY KEY,
  "offerId" text NOT NULL,
  "userId" text NOT NULL,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("offerId", "userId"),
  CONSTRAINT "RedeemedOffer_offerId_userId_key" UNIQUE ("offerId", "userId")
);
CREATE TABLE "Subscription" (
  "id" text NOT NULL PRIMARY KEY,
  "userId" text NOT NULL,
  "plan" "SubscriptionPlan" NOT NULL,
  "stripeSubscriptionId" text,
  "stripeCustomerId" text,
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE'::"SubscriptionStatus",
  "currentPeriodStart" timestamp(3) NOT NULL,
  "currentPeriodEnd" timestamp(3) NOT NULL,
  "cancelAtPeriodEnd" boolean NOT NULL DEFAULT false,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL,
  CONSTRAINT "Subscription_userId_key" UNIQUE ("userId"),
  CONSTRAINT "Subscription_stripeSubscriptionId_key" UNIQUE ("stripeSubscriptionId")
);
CREATE TABLE "LeaderboardEntry" (
  "id" text NOT NULL PRIMARY KEY,
  "userId" text NOT NULL,
  "period" "LeaderboardPeriod" NOT NULL,
  "scope" "LeaderboardScope" NOT NULL,
  "scopeValue" text,
  "categoryId" text,
  "score" integer NOT NULL DEFAULT 0,
  "rank" integer,
  "updatedAt" timestamp(3) NOT NULL,
  UNIQUE ("userId", "period", "scope", "scopeValue", "categoryId"),
  CONSTRAINT "LeaderboardEntry_userId_period_scope_scopeValue_categoryId_key" UNIQUE ("userId", "period", "scope", "scopeValue", "categoryId")
);
CREATE TABLE "Notification" (
  "id" text NOT NULL PRIMARY KEY,
  "userId" text NOT NULL,
  "type" "NotificationType" NOT NULL,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "data" jsonb,
  "link" text,
  "isRead" boolean NOT NULL DEFAULT false,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "PushSubscription" (
  "id" text NOT NULL PRIMARY KEY,
  "userId" text NOT NULL,
  "endpoint" text NOT NULL,
  "p256dh" text NOT NULL,
  "auth" text NOT NULL,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PushSubscription_endpoint_key" UNIQUE ("endpoint")
);
CREATE TABLE "Advertisement" (
  "id" text NOT NULL PRIMARY KEY,
  "partnerId" text,
  "title" text NOT NULL,
  "description" text,
  "imageUrl" text,
  "linkUrl" text NOT NULL,
  "targetCity" text,
  "targetCategories" text[] NOT NULL,
  "impressions" integer NOT NULL DEFAULT 0,
  "clicks" integer NOT NULL DEFAULT 0,
  "budget" double precision NOT NULL,
  "costPerClick" double precision NOT NULL,
  "isActive" boolean NOT NULL DEFAULT true,
  "startDate" timestamp(3) NOT NULL,
  "endDate" timestamp(3) NOT NULL,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "ImageBlob" (
  "id" text NOT NULL PRIMARY KEY,
  "ownerId" text NOT NULL,
  "data" bytea NOT NULL,
  "mime" text NOT NULL DEFAULT 'image/webp',
  "name" text,
  "width" integer,
  "height" integer,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "ContactMessage" (
  "id" text NOT NULL PRIMARY KEY,
  "userId" text,
  "email" text NOT NULL,
  "name" text,
  "subject" text NOT NULL,
  "message" text NOT NULL,
  "handled" boolean NOT NULL DEFAULT false,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "IntroCard" (
  "id" text NOT NULL PRIMARY KEY,
  "userId" text NOT NULL,
  "title" text NOT NULL,
  "about" text NOT NULL,
  "lookingFor" text,
  "photoUrl" text,
  "photos" text[] NOT NULL DEFAULT '[]',
  "passions" text[] NOT NULL DEFAULT '[]',
  "profession" text,
  "education" text,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL,
  CONSTRAINT "IntroCard_userId_key" UNIQUE ("userId")
);
CREATE INDEX "_InterestToUser_B_index" ON "_InterestToUser" ("B");
ALTER TABLE "_InterestToUser" ADD CONSTRAINT "_InterestToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Interest" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_InterestToUser" ADD CONSTRAINT "_InterestToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "_EventCategoryToUser_B_index" ON "_EventCategoryToUser" ("B");
ALTER TABLE "_EventCategoryToUser" ADD CONSTRAINT "_EventCategoryToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "EventCategory" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_EventCategoryToUser" ADD CONSTRAINT "_EventCategoryToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "User_latitude_longitude_idx" ON "User" ("latitude", "longitude");
CREATE INDEX "User_city_idx" ON "User" ("city");
CREATE INDEX "User_averageRating_idx" ON "User" ("averageRating");
CREATE INDEX "ProfilePhoto_userId_idx" ON "ProfilePhoto" ("userId");
CREATE INDEX "ProfilePhoto_albumId_idx" ON "ProfilePhoto" ("albumId");
ALTER TABLE "ProfilePhoto" ADD CONSTRAINT "ProfilePhoto_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProfilePhoto" ADD CONSTRAINT "ProfilePhoto_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "PhotoAlbum" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "PhotoAlbum_userId_idx" ON "PhotoAlbum" ("userId");
ALTER TABLE "PhotoAlbum" ADD CONSTRAINT "PhotoAlbum_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "ConnectedAccount_userId_idx" ON "ConnectedAccount" ("userId");
ALTER TABLE "ConnectedAccount" ADD CONSTRAINT "ConnectedAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "VerificationCode_target_type_idx" ON "VerificationCode" ("target", "type");
ALTER TABLE "VerificationCode" ADD CONSTRAINT "VerificationCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FriendRequest" ADD CONSTRAINT "FriendRequest_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FriendRequest" ADD CONSTRAINT "FriendRequest_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "Friendship_userAId_idx" ON "Friendship" ("userAId");
CREATE INDEX "Friendship_userBId_idx" ON "Friendship" ("userBId");
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "EventLike_userId_idx" ON "EventLike" ("userId");
ALTER TABLE "EventLike" ADD CONSTRAINT "EventLike_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventLike" ADD CONSTRAINT "EventLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "Event_latitude_longitude_idx" ON "Event" ("latitude", "longitude");
CREATE INDEX "Event_city_idx" ON "Event" ("city");
CREATE INDEX "Event_startDate_idx" ON "Event" ("startDate");
CREATE INDEX "Event_status_idx" ON "Event" ("status");
CREATE INDEX "Event_categoryId_idx" ON "Event" ("categoryId");
ALTER TABLE "Event" ADD CONSTRAINT "Event_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Event" ADD CONSTRAINT "Event_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Event" ADD CONSTRAINT "Event_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "EventCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Event" ADD CONSTRAINT "Event_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "Partner" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EventCollaborator" ADD CONSTRAINT "EventCollaborator_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "EventParticipation_userId_idx" ON "EventParticipation" ("userId");
ALTER TABLE "EventParticipation" ADD CONSTRAINT "EventParticipation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventParticipation" ADD CONSTRAINT "EventParticipation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "Story_authorId_idx" ON "Story" ("authorId");
CREATE INDEX "Story_createdAt_idx" ON "Story" ("createdAt");
ALTER TABLE "Story" ADD CONSTRAINT "Story_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "SavedStory_userId_idx" ON "SavedStory" ("userId");
ALTER TABLE "SavedStory" ADD CONSTRAINT "SavedStory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SavedStory" ADD CONSTRAINT "SavedStory_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "StoryLike_storyId_idx" ON "StoryLike" ("storyId");
CREATE INDEX "StoryLike_userId_idx" ON "StoryLike" ("userId");
ALTER TABLE "StoryLike" ADD CONSTRAINT "StoryLike_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoryLike" ADD CONSTRAINT "StoryLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "WaitlistEntry_eventId_position_idx" ON "WaitlistEntry" ("eventId", "position");
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventInvitation" ADD CONSTRAINT "EventInvitation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventInvitation" ADD CONSTRAINT "EventInvitation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "EventChatMessage_eventId_createdAt_idx" ON "EventChatMessage" ("eventId", "createdAt");
ALTER TABLE "EventChatMessage" ADD CONSTRAINT "EventChatMessage_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventChatMessage" ADD CONSTRAINT "EventChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConversationMember" ADD CONSTRAINT "ConversationMember_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConversationMember" ADD CONSTRAINT "ConversationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessageHide" ADD CONSTRAINT "MessageHide_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "DirectMessage" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessageHide" ADD CONSTRAINT "MessageHide_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "UserBlock_blockedId_idx" ON "UserBlock" ("blockedId");
ALTER TABLE "UserBlock" ADD CONSTRAINT "UserBlock_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserBlock" ADD CONSTRAINT "UserBlock_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "DirectMessage_conversationId_createdAt_idx" ON "DirectMessage" ("conversationId", "createdAt");
ALTER TABLE "DirectMessage" ADD CONSTRAINT "DirectMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DirectMessage" ADD CONSTRAINT "DirectMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DirectMessage" ADD CONSTRAINT "DirectMessage_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EventAlbum" ADD CONSTRAINT "EventAlbum_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Media" ADD CONSTRAINT "Media_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "EventAlbum" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Media" ADD CONSTRAINT "Media_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MediaIdentification" ADD CONSTRAINT "MediaIdentification_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MediaIdentification" ADD CONSTRAINT "MediaIdentification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "UserRating_toId_idx" ON "UserRating" ("toId");
ALTER TABLE "UserRating" ADD CONSTRAINT "UserRating_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserRating" ADD CONSTRAINT "UserRating_toId_fkey" FOREIGN KEY ("toId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_reportedId_fkey" FOREIGN KEY ("reportedId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CarpoolOffer" ADD CONSTRAINT "CarpoolOffer_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CarpoolOffer" ADD CONSTRAINT "CarpoolOffer_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CarpoolRequest" ADD CONSTRAINT "CarpoolRequest_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "CarpoolOffer" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CarpoolRequest" ADD CONSTRAINT "CarpoolRequest_passengerId_fkey" FOREIGN KEY ("passengerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Page" ADD CONSTRAINT "Page_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PageFollow" ADD CONSTRAINT "PageFollow_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PageFollow" ADD CONSTRAINT "PageFollow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "InterestGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ForumPost" ADD CONSTRAINT "ForumPost_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "InterestGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ForumPost" ADD CONSTRAINT "ForumPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ForumReply" ADD CONSTRAINT "ForumReply_postId_fkey" FOREIGN KEY ("postId") REFERENCES "ForumPost" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ForumReply" ADD CONSTRAINT "ForumReply_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PartnerOffer" ADD CONSTRAINT "PartnerOffer_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PartnerOffer" ADD CONSTRAINT "PartnerOffer_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RedeemedOffer" ADD CONSTRAINT "RedeemedOffer_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "PartnerOffer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RedeemedOffer" ADD CONSTRAINT "RedeemedOffer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "LeaderboardEntry_period_scope_scopeValue_score_idx" ON "LeaderboardEntry" ("period", "scope", "scopeValue", "score");
ALTER TABLE "LeaderboardEntry" ADD CONSTRAINT "LeaderboardEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Notification_userId_isRead_createdAt_idx" ON "Notification" ("userId", "isRead", "createdAt");
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Advertisement" ADD CONSTRAINT "Advertisement_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "ImageBlob_ownerId_idx" ON "ImageBlob" ("ownerId");
CREATE INDEX "ContactMessage_handled_createdAt_idx" ON "ContactMessage" ("handled", "createdAt");
CREATE INDEX "IntroCard_createdAt_idx" ON "IntroCard" ("createdAt");
ALTER TABLE "IntroCard" ADD CONSTRAINT "IntroCard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
