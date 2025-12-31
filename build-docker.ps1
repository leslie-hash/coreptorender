# CorePTO Docker Build and Push Script (PowerShell)
# Usage: .\build-docker.ps1 [version]

param(
    [string]$Version = "latest"
)

$IMAGE_NAME = "ghcr.io/devops-zimworx/corepto1"

Write-Host ""
Write-Host "Building CorePTO Docker Image" -ForegroundColor Green
Write-Host "=============================" -ForegroundColor Green
Write-Host "Image: $IMAGE_NAME"
Write-Host "Version: $Version"
Write-Host ""

# Build the image
Write-Host "Building Docker image..." -ForegroundColor Cyan
docker build -t "${IMAGE_NAME}:${Version}" .

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

# Tag as latest if version is not latest
if ($Version -ne "latest") {
    Write-Host "Tagging as latest..." -ForegroundColor Cyan
    docker tag "${IMAGE_NAME}:${Version}" "${IMAGE_NAME}:latest"
}

Write-Host ""
Write-Host "Build complete!" -ForegroundColor Green
Write-Host ""
Write-Host "To push to GitHub Container Registry:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  docker push ${IMAGE_NAME}:${Version}"
if ($Version -ne "latest") {
    Write-Host "  docker push ${IMAGE_NAME}:latest"
}
Write-Host ""
Write-Host "To test locally:" -ForegroundColor Yellow
Write-Host "  docker run -p 8000:8000 -e PORT=8000 ${IMAGE_NAME}:${Version}"
Write-Host ""
