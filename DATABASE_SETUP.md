# VANES AI database setup (Cloudflare Dashboard only)

The repository now contains a privacy-aware analytics API and a private admin dashboard.

## 1. Create the database
In Cloudflare Dashboard:
1. Open Workers & Pages.
2. Open D1 SQL database.
3. Create a database named vanes-ai-db.

## 2. Bind it to the VANES Worker
1. Open Workers & Pages → vanes-ai.
2. Open Settings → Bindings.
3. Add a D1 database binding.
4. Variable name: DB.
5. Select vanes-ai-db.
6. Save/deploy.

The API creates the vanes_events table automatically on the first analytics request. schema.sql is also included for reference.

## 3. Protect the developer dashboard
In Settings → Variables and Secrets, add a secret:
- Name: ADMIN_ANALYTICS_TOKEN
- Value: a long random private token known only to the developer.

Then open /admin-analytics.html.
Enter the token in the dashboard to view anonymous users, event counts and recent activity.

## Privacy
VANES uses an anonymous browser identifier. Question/answer content is not sent for improvement unless the learner explicitly enables the anonymised-learning-data option in Settings. Names, phone numbers and payment credentials are not part of the analytics event payload.

## 4. Automatic deployment
A Cloudflare deployment workflow is included at .github/workflows/deploy-cloudflare.yml. To enable it without using Command Prompt, add these GitHub repository secrets under Settings → Secrets and variables → Actions:
- CLOUDFLARE_API_TOKEN
- CLOUDFLARE_ACCOUNT_ID
Then add a repository variable named CLOUDFLARE_DEPLOY_ENABLED with value true. Future pushes to main will deploy the Worker automatically.
