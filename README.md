# EDC Participant Portal

A self-service portal for companies to register and manage their participation in dataspace ecosystems built on Eclipse Dataspace Component (EDC). This portal provides a streamlined registration process, user dashboard, and credential management for organizations joining dataspace networks.

## Overview

This portal enables companies to register themselves as participants in an EDC-based dataspace. The registration process collects company information, creates user accounts, and initiates the provisioning workflow. Once registered, users can access their dashboard to view their company details, manage credentials, and monitor their participation status.

The portal is built with Angular 20 and TailwindCSS. It supports both authenticated and unauthenticated modes, with optional Keycloak integration for enterprise identity management.

## Prerequisites

- Node.js 18 or higher
- npm (comes with Node.js)
- An EDC backend with participant registration and management API endpoints

## Quick Start

Clone the repository and install dependencies:

```bash
npm install
```

For local development with the included mock server:

```bash
npm run start:mock
```

This starts the mock API server on port 3001 and the Angular development server on port 4200. Open http://localhost:4200 in your browser.

To run only the Angular app (pointing to your own backend):

```bash
npm start
```

The app will be available at http://localhost:4200.

## Building for Production

```bash
npm run build
```

The production build will be in `dist/edc-public-participant-portal/browser`. You can serve this with any static file server or integrate it into your deployment pipeline.

For development with automatic rebuilds:

```bash
npm run watch
```

## API Requirements

This portal expects a REST API that follows the EDC participant registration pattern. The backend should provide these endpoints:

### Participant Registration

- `POST /v1/participants` - Register a new participant with company and user information
  - Request body includes participant metadata (company name, description, contact info) and user account details
  - Returns participant ID, user ID, and registration status

### Participant Management

- `GET /v1/participants/:participantId` - Get participant details
- `GET /v1/participants/me` - Get current user's participant profile (requires authentication)
- `PATCH /v1/participants/:participantId` - Update participant metadata
- `DELETE /v1/participants/:participantId` - Delete a participant account

### Credentials

- `GET /v1/participants/:participantId/credentials` - List participant credentials
- `POST /v1/participants/:participantId/credentials` - Request new credentials
  - Supports MembershipCredential and DataProcessorCredential types

### Response Format

The registration API should return data in this format:

```json
{
  "participant": {
    "id": "string",
    "name": "string",
    "description": "string",
    "did": "string",
    "host": "string",
    "currentOperation": "PROVISION_IN_PROGRESS" | "ACTIVE" | "ERROR",
    "metadata": {},
    "createdAt": "ISO8601 timestamp"
  },
  "user": {
    "id": "string",
    "username": "string",
    "metadata": {
      "firstName": "string",
      "lastName": "string",
      "email": "string",
      "role": "ADMIN"
    }
  }
}
```

## Configuration

Configuration is managed through JSON files in `src/assets/config/`:

- `config.json` - Main configuration file loaded at runtime

Key configuration options:

- `apiUrl` - Base URL for your EDC backend API
- `appName` - Application display name
- `auth.enableAuth` - Enable/disable authentication
- `auth.keycloak` - Keycloak settings (URL, realm, clientId)
- `auth.roles` - Role definitions for authorization
- `features.enableDevMode` - Enable development mode with pre-populated forms
- `features.enableDebugMode` - Enable debug logging

The configuration file is loaded at application startup. If the file cannot be loaded, the application falls back to default development settings.

## Authentication

The portal supports optional Keycloak integration for authentication. When enabled, users must authenticate before accessing protected routes. The authentication flow uses PKCE (Proof Key for Code Exchange) for security.

Keycloak configuration includes:
- Identity provider URL
- Realm name
- Client ID
- Login flow behavior (login-required or check-sso)

When authentication is disabled, the portal operates in open registration mode where anyone can register without prior authentication.

## Features

- **Self-Service Registration**: Multi-step registration form for company and user information
- **User Dashboard**: View company details, participant status, and credentials
- **Credential Management**: Request and view company credentials
- **Account Settings**: Manage account information and delete account
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Role-Based Access**: Support for different user roles (admin, participant)

## Project Structure

```
src/app/
├── core/                    # Core services, models, guards, interceptors
│   ├── services/            # Business logic services
│   │   ├── auth.service.ts
│   │   ├── config.service.ts
│   │   ├── participant.service.ts
│   │   └── participant-data.service.ts
│   ├── models/              # TypeScript interfaces and types
│   ├── guards/              # Route guards
│   ├── interceptors/        # HTTP interceptors
│   └── init/                # Initialization factories
├── features/                # Feature modules
│   ├── landing/             # Landing page
│   ├── registration/         # Participant registration
│   ├── success/             # Registration success page
│   ├── dashboard/           # User dashboard
│   ├── settings/            # Account settings
│   └── role-error/          # Role error page
└── shared/                  # Shared components and utilities
    ├── components/           # Reusable components
    ├── services/            # Shared services
    └── utils/               # Utility functions
```

## Development

The project uses Angular 20 with standalone components. Services are provided at the root level for dependency injection. State management is handled through RxJS Observables and BehaviorSubjects.

The mock server (`mock-server/`) provides a simple JSON-based API for development and testing. It includes endpoints for participant registration and credential management.

### Development Mode

When `enableDevMode` is enabled in the configuration, the registration form is pre-populated with sample data to speed up testing. This feature should be disabled in production.

## Testing

Run the test suite:

```bash
npm test
```

## Deployment

After building, the `dist/edc-public-participant-portal/browser` folder contains everything needed for deployment. You can:

- Serve it with nginx, Apache, or any static file server
- Deploy to cloud storage services (S3, Azure Blob, etc.)
- Integrate into containerized deployments (Docker, Kubernetes)

Make sure to configure the `apiUrl` in your production config to point to your EDC backend. For containerized deployments, you may want to use environment-specific configuration files or environment variables.

### Docker

A Dockerfile is included for containerized deployments. Build the image:

```bash
docker build -t edc-participant-portal .
```

### Nginx

An nginx configuration template is provided in `nginx/templates/nginx.conf.template`. This can be used with environment variable substitution for flexible deployment configurations.

## License

Licensed under the Apache License, Version 2.0. See the LICENSE file for details.

## Contributing

Contributions are welcome. Please feel free to submit a Pull Request.

## Support

For issues and questions, please open an issue on the project repository.

