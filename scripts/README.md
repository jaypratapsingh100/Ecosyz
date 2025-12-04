# Scripts Directory

This directory contains all shell scripts (.sh files) for the project.

## Scripts Overview

### Setup & Configuration
- **local-setup.sh** - Local development environment setup script
- **setup-storage.sh** - Storage configuration setup script

### Testing Scripts
- **test-all-auth-methods.sh** - Test all authentication methods
- **test-auth-apis.sh** - Test authentication API endpoints
- **test-oauth-providers.sh** - Test OAuth provider integrations
- **test-vercel-apis.sh** - Test Vercel API endpoints
- **verify-oauth-user.sh** - Verify OAuth user authentication

### Cleanup Scripts
- **cleanup-users.sh** - Clean up user data
- **cleanup-all-users.sh** - Clean up all users from database

## Usage

All scripts should be made executable before running:

```bash
chmod +x scripts/*.sh
```

Then run them from the project root:

```bash
./scripts/script-name.sh
```

## Notes

- Most scripts require the development server to be running
- Some scripts may require environment variables to be set
- Check individual script headers for specific requirements

