# Frontend Dockerfile
# Uses nginx alpine for minimal size

FROM nginx:alpine

# Copy static files
COPY index.html /usr/share/nginx/html/

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# nginx runs in foreground by default in this image
CMD ["nginx", "-g", "daemon off;"]
