# AWS deployment guide (ECS/Fargate)

The project includes Dockerfiles and is ready to containerize. This guide describes a manual deployment path; it does not create AWS resources or deploy the app automatically.

## Recommended learning deployment

Use **Amazon ECS on AWS Fargate** with an Application Load Balancer and an ECR repository for each container (`taskflow-frontend`, `taskflow-backend`, `taskflow-analytics`). Keep the Python analytics service private. For a quick portfolio demo, the three containers can run as one ECS task so the services communicate over `localhost`; for a more production-like setup, run separate services and configure private service discovery.

### Before starting

- An AWS account with permission to create ECR, ECS, IAM roles, networking, and an Application Load Balancer.
- AWS CLI configured with `aws configure`.
- Docker installed locally.
- Choose your AWS Region; the commands below use `ap-south-1` (Mumbai). Replace the example account ID with your own.

### 1. Build and test the containers locally

From the project root:

```bash
docker compose up --build
```

Confirm the UI loads at `http://localhost:4200`, then stop the services. Before a public deployment, replace the JSON file store with a managed database and add login/authentication.

### 2. Create ECR repositories

```bash
aws ecr create-repository --repository-name taskflow-frontend --region ap-south-1
aws ecr create-repository --repository-name taskflow-backend --region ap-south-1
aws ecr create-repository --repository-name taskflow-analytics --region ap-south-1
```

Sign in to ECR (replace `ACCOUNT_ID`):

```bash
aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com
```

### 3. Build and push images

Run these commands from the project root, replacing `ACCOUNT_ID`:

```bash
docker build -f frontend-angular/Dockerfile -t taskflow-frontend .
docker build -f backend-node/Dockerfile -t taskflow-backend .
docker build -f analytics-python/Dockerfile -t taskflow-analytics .

docker tag taskflow-frontend:latest ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com/taskflow-frontend:latest
docker tag taskflow-backend:latest ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com/taskflow-backend:latest
docker tag taskflow-analytics:latest ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com/taskflow-analytics:latest

docker push ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com/taskflow-frontend:latest
docker push ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com/taskflow-backend:latest
docker push ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com/taskflow-analytics:latest
```

### 4. Create the ECS resources

In the AWS Console:

1. Create an ECS cluster using the **AWS Fargate** launch type.
2. Create an ECS task definition with three containers, using the image URIs pushed above. Set container ports to 80 (frontend), 3000 (Node API), and 5000 (Python analytics).
3. For a **single-task demo**, configure `ANALYTICS_URL=http://127.0.0.1:5000/api/analytics` on the backend and change `frontend-angular/nginx.conf` to proxy `/api/` to `http://127.0.0.1:3000`. Rebuild and push images after these changes. In a single ECS task using `awsvpc` networking, containers can communicate over localhost.
4. Add an ECS task execution role following the AWS console wizard. Grant only the permissions required for ECR image pulls and CloudWatch Logs.
5. Place the task in private subnets where practical. Create an Application Load Balancer in public subnets and forward HTTP/HTTPS traffic to the frontend's port 80.
6. Create an ECS service, attach the target group, and configure desired task count. Add an ACM certificate and HTTPS listener before sharing a public URL.
7. Check CloudWatch logs and the ALB target health. Test the UI and `/api/health` endpoint over the configured load balancer.

For a more realistic multi-service architecture, use private ECS services and Cloud Map service discovery, and update the frontend proxy and Node analytics URL to their private service DNS names. Do not expose port 5000 publicly.

## Production hardening checklist

- **Persistence:** The demo uses `backend-node/data/tasks.json`; container task filesystems are not durable storage. Replace this with a database such as Amazon RDS or DocumentDB before using the app beyond a demo.
- **Security:** Add authentication, per-user authorization, request throttling, stricter CORS, and HTTPS. Keep the analytics endpoint private.
- **Secrets:** Store sensitive configuration in AWS Secrets Manager or SSM Parameter Store; never commit credentials.
- **Reliability:** Add health checks, CloudWatch alarms, structured logs, backups, and a rolling deployment strategy.
- **Cost:** Remove demo resources (especially the load balancer and NAT gateways) when finished experimenting; they can incur charges.
