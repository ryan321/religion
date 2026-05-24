CREATE TABLE "great_mind_books" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"great_mind_id" uuid NOT NULL,
	"book_id" uuid NOT NULL,
	CONSTRAINT "great_mind_books_great_mind_id_book_id_unique" UNIQUE("great_mind_id","book_id")
);
--> statement-breakpoint
CREATE TABLE "great_mind_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"great_mind_id" uuid NOT NULL,
	"role" "message_role" NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "great_minds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"years" text NOT NULL,
	"short_bio" text NOT NULL,
	"domain" text NOT NULL,
	"system_prompt" text NOT NULL,
	"image_url" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "great_minds_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "great_mind_books" ADD CONSTRAINT "great_mind_books_great_mind_id_great_minds_id_fk" FOREIGN KEY ("great_mind_id") REFERENCES "public"."great_minds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "great_mind_books" ADD CONSTRAINT "great_mind_books_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "great_mind_messages" ADD CONSTRAINT "great_mind_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "great_mind_messages" ADD CONSTRAINT "great_mind_messages_great_mind_id_great_minds_id_fk" FOREIGN KEY ("great_mind_id") REFERENCES "public"."great_minds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_great_mind_messages_user_mind" ON "great_mind_messages" USING btree ("user_id","great_mind_id");