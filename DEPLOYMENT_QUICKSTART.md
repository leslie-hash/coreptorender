# CorePTO Deployment Quick Reference

## Current Status
✅ Terraform configuration ready
✅ Dockerfile created
⏳ Docker Desktop installing...

## After Docker Installation

### 1. Restart Required
After Docker installs, you'll need to:
- Restart your computer (required)
- Open Docker Desktop
- Wait for Docker engine to start (whale icon in system tray)

### 2. Build Docker Image
```powershell
# Build the image
docker build -t ghcr.io/devops-zimworx/corepto1:v1.0.0 .

# Tag as latest
docker tag ghcr.io/devops-zimworx/corepto1:v1.0.0 ghcr.io/devops-zimworx/corepto1:latest
```

### 3. Test Locally (Optional)
```powershell
# Run the container locally
docker run -p 8000:8000 -e PORT=8000 ghcr.io/devops-zimworx/corepto1:v1.0.0

# Test health endpoint
curl http://localhost:8000/health
```

### 4. Push to GitHub Container Registry
```powershell
# Login (get token from: https://github.com/settings/tokens)
$env:GITHUB_TOKEN = "ghp_your_token_here"
echo $env:GITHUB_TOKEN | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin

# Push images
docker push ghcr.io/devops-zimworx/corepto1:v1.0.0
docker push ghcr.io/devops-zimworx/corepto1:latest
```

### 5. Configure Terraform
```powershell
cd aws-iac/environments/staging

# Create terraform.tfvars if it doesn't exist
@"
enable_corepto = true
enable_intraworx = true
corepto_image = "ghcr.io/devops-zimworx/corepto1:v1.0.0"
"@ | Out-File -FilePath terraform.tfvars -Encoding utf8 -Append
```

### 6. Deploy with Terraform
```powershell
# Initialize Terraform (first time only)
terraform init

# Preview changes
terraform plan

# Deploy!
terraform apply
```

## Important Notes

### GitHub Token Permissions
Your GitHub token needs these scopes:
- `write:packages` - To push images to GHCR
- `read:packages` - To pull images
- `delete:packages` - To delete old images (optional)

Create token at: https://github.com/settings/tokens/new

### Docker Desktop Settings
After installation:
- Enable "Use WSL 2 based engine" (if prompted)
- Allocate at least 4GB RAM for Docker
- Enable Kubernetes is optional (not needed for this)

### First Build Time
The first Docker build will take 5-10 minutes as it:
- Downloads Node.js base image
- Installs all npm dependencies
- Builds the frontend
- Creates the production image

Subsequent builds will be faster due to layer caching.

## Troubleshooting

### "Docker daemon is not running"
- Open Docker Desktop application
- Wait for the whale icon to stop animating
- Should say "Docker Desktop is running"

### Build fails on Windows
- Make sure Docker Desktop is set to "Linux containers" mode
- Right-click whale icon → "Switch to Linux containers"

### Cannot push to GHCR
- Verify you're logged in: `docker login ghcr.io`
- Check token permissions
- Ensure image name matches: `ghcr.io/devops-zimworx/corepto1`

### Health check fails
- The app uses `/health` endpoint (not `/api/health`)
- Port should be 8000 in production (configured via PORT env var)
- Check logs: `docker logs <container-id>`

## Next Steps After Deployment

1. Verify deployment:
   ```powershell
   curl https://api.corepto.staging.intraworx.cloud/health
   ```

2. Check ECS logs:
   ```powershell
   aws logs tail /ecs/intraworx-staging-corepto --follow --region us-west-2
   ```

3. Monitor service:
   ```powershell
   aws ecs describe-services --cluster intraworx-staging-intraworx --services intraworx-staging-corepto --region us-west-2
   ```

## Useful Commands

```powershell
# Check Docker version
docker --version

# List images
docker images

# List running containers
docker ps

# View container logs
docker logs <container-id>

# Stop container
docker stop <container-id>

# Remove image
docker rmi ghcr.io/devops-zimworx/corepto1:v1.0.0
```
