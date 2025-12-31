#!/bin/bash
# CorePTO Docker Build and Push Script

set -e

# Configuration
IMAGE_NAME="ghcr.io/devops-zimworx/corepto1"
VERSION="${1:-latest}"

echo "🚀 Building CorePTO Docker Image"
echo "=================================="
echo "Image: $IMAGE_NAME"
echo "Version: $VERSION"
echo ""

# Build the image
echo "📦 Building Docker image..."
docker build -t "$IMAGE_NAME:$VERSION" .

# Tag as latest if version is not latest
if [ "$VERSION" != "latest" ]; then
    echo "🏷️  Tagging as latest..."
    docker tag "$IMAGE_NAME:$VERSION" "$IMAGE_NAME:latest"
fi

echo ""
echo "✅ Build complete!"
echo ""
echo "📤 Ready to push. Run the following commands:"
echo ""
echo "  # Login to GitHub Container Registry"
echo "  echo \$GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin"
echo ""
echo "  # Push the images"
echo "  docker push $IMAGE_NAME:$VERSION"
if [ "$VERSION" != "latest" ]; then
    echo "  docker push $IMAGE_NAME:latest"
fi
echo ""
echo "🧪 To test locally:"
echo "  docker run -p 8000:8000 --env-file .env $IMAGE_NAME:$VERSION"
