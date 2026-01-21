alter table "public"."test_steps"
add column "parent_step_id" uuid references "public"."test_steps"("id");

create index "test_steps_parent_step_idx" on "public"."test_steps"("parent_step_id");
