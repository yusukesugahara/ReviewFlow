# テーブル定義（テキストER）

## tenants
- id: string (PK)
- name: string
- plan: enum(free, standard, pro)
- status: enum(trial, active, suspended)
- created_at: datetime
- updated_at: datetime

## users
- id: string (PK)
- tenant_id: string (FK -> tenants.id)
- name: string
- email: string
- password_hash: string
- role: enum(tenant_admin, tenant_user)
- is_active: boolean
- created_at: datetime
- updated_at: datetime

## invitations
- id: string (PK)
- tenant_id: string (FK -> tenants.id)
- email: string
- role: enum(tenant_admin, tenant_user)
- token: string
- status: enum(pending, accepted, expired, revoked)
- invited_by_user_id: string (FK -> users.id)
- expires_at: datetime
- created_at: datetime

## form_templates
- id: string (PK)
- tenant_id: string (FK -> tenants.id)
- name: string
- description: string nullable
- status: enum(draft, published, archived)
- created_by_user_id: string (FK -> users.id)
- created_at: datetime
- updated_at: datetime

## form_fields
- id: string (PK)
- tenant_id: string (FK -> tenants.id)
- form_template_id: string (FK -> form_templates.id)
- field_key: string
- label: string
- field_type: enum(text, textarea, number, date, select, radio, checkbox)
- required: boolean
- placeholder: string nullable
- help_text: string nullable
- options_json: json nullable
- sort_order: int
- created_at: datetime
- updated_at: datetime

## approval_flows
- id: string (PK)
- tenant_id: string (FK -> tenants.id)
- form_template_id: string (FK -> form_templates.id)
- name: string
- is_active: boolean
- created_at: datetime
- updated_at: datetime

## approval_steps
- id: string (PK)
- tenant_id: string (FK -> tenants.id)
- approval_flow_id: string (FK -> approval_flows.id)
- step_order: int
- step_name: string
- assignee_user_id: string (FK -> users.id)
- can_return: boolean
- created_at: datetime
- updated_at: datetime

## applications
- id: string (PK)
- tenant_id: string (FK -> tenants.id)
- applicant_user_id: string nullable (FK -> users.id)
- applicant_email: string
- form_template_id: string (FK -> form_templates.id)
- approval_flow_id: string (FK -> approval_flows.id)
- current_step_order: int nullable
- status: enum(draft, submitted, in_review, returned, approved, rejected)
- submitted_at: datetime nullable
- created_at: datetime
- updated_at: datetime

## application_field_values
- id: string (PK)
- tenant_id: string (FK -> tenants.id)
- application_id: string (FK -> applications.id)
- form_field_id: string (FK -> form_fields.id)
- value_json: json
- created_at: datetime
- updated_at: datetime

## application_approvals
- id: string (PK)
- tenant_id: string (FK -> tenants.id)
- application_id: string (FK -> applications.id)
- approval_step_id: string (FK -> approval_steps.id)
- acted_by_user_id: string (FK -> users.id)
- action: enum(approved, returned, rejected)
- comment: string nullable
- acted_at: datetime

## correction_requests
- id: string (PK)
- tenant_id: string (FK -> tenants.id)
- application_id: string (FK -> applications.id)
- requested_by_user_id: string (FK -> users.id)
- status: enum(open, resolved)
- overall_comment: string nullable
- created_at: datetime
- resolved_at: datetime nullable

## correction_request_items
- id: string (PK)
- tenant_id: string (FK -> tenants.id)
- correction_request_id: string (FK -> correction_requests.id)
- form_field_id: string (FK -> form_fields.id)
- comment: string nullable
- is_resolved: boolean
- created_at: datetime

## export_jobs
- id: string (PK)
- tenant_id: string (FK -> tenants.id)
- requested_by_user_id: string (FK -> users.id)
- status: enum(queued, processing, completed, failed)
- filter_json: json nullable
- file_path: string nullable
- started_at: datetime nullable
- finished_at: datetime nullable
- created_at: datetime

## audit_logs
- id: string (PK)
- tenant_id: string (FK -> tenants.id)
- actor_user_id: string nullable (FK -> users.id)
- action_type: string
- target_type: string
- target_id: string nullable
- metadata_json: json nullable
- created_at: datetime

## インデックス方針
- users: unique(tenant_id, email)
- form_fields: index(tenant_id, form_template_id, sort_order)
- approval_steps: unique(approval_flow_id, step_order)
- applications: index(tenant_id, status, created_at)
- application_field_values: unique(application_id, form_field_id)
- correction_request_items: index(correction_request_id, form_field_id)
- export_jobs: index(tenant_id, status, created_at)
- audit_logs: index(tenant_id, created_at)
