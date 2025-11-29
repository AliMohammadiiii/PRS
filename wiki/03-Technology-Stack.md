# Technology Stack

## Backend Technologies

### Core Framework

- **Django 5.0+**: High-level Python web framework
  - URL: https://www.djangoproject.com/
  - Version: 5.0 or later
  - Purpose: Web framework, ORM, admin interface

- **Django REST Framework (DRF) 3.15+**: RESTful API framework
  - URL: https://www.django-rest-framework.org/
  - Version: 3.15 or later
  - Purpose: API serialization, viewsets, authentication

### Authentication & Security

- **djangorestframework-simplejwt 5.3+**: JWT authentication
  - URL: https://django-rest-framework-simplejwt.readthedocs.io/
  - Version: 5.3 or later
  - Purpose: JWT token generation and validation

- **django-cors-headers 4.4+**: CORS handling
  - URL: https://github.com/adamchainz/django-cors-headers
  - Version: 4.4 or later
  - Purpose: Cross-origin resource sharing configuration

- **django-ratelimit 4.1.0+**: Rate limiting
  - URL: https://github.com/jsocol/django-ratelimit
  - Version: 4.1.0 or later
  - Purpose: API rate limiting for security

### API Documentation

- **drf-spectacular 0.27+**: OpenAPI schema generation
  - URL: https://drf-spectacular.readthedocs.io/
  - Version: 0.27 or later
  - Purpose: Automatic API documentation (Swagger/OpenAPI)

### Database

- **PostgreSQL**: Production database
  - URL: https://www.postgresql.org/
  - Version: 12 or later
  - Purpose: Primary relational database

- **SQLite**: Development database
  - Built into Python
  - Purpose: Local development and testing

- **psycopg[binary] 3.2+**: PostgreSQL adapter
  - URL: https://www.psycopg.org/
  - Version: 3.2 or later
  - Purpose: Python PostgreSQL database adapter

### Production Server

- **Gunicorn 23.0+**: WSGI HTTP Server
  - URL: https://gunicorn.org/
  - Version: 23.0 or later
  - Purpose: Production WSGI server

### Testing

- **pytest 7.4.0+**: Testing framework
  - URL: https://pytest.org/
  - Version: 7.4.0 or later
  - Purpose: Unit and integration testing

- **pytest-django 4.7.0+**: Django integration for pytest
  - URL: https://pytest-django.readthedocs.io/
  - Version: 4.7.0 or later
  - Purpose: Django-specific test utilities

- **pytest-cov 4.1.0+**: Coverage plugin
  - URL: https://pytest-cov.readthedocs.io/
  - Version: 4.1.0 or later
  - Purpose: Code coverage reporting

## Frontend Technologies

### Core Framework

- **React 19**: UI library
  - URL: https://react.dev/
  - Version: 19.2.0
  - Purpose: Component-based UI development

- **TypeScript 5.9+**: Type-safe JavaScript
  - URL: https://www.typescriptlang.org/
  - Version: 5.9.2
  - Purpose: Type safety and better developer experience

### Routing

- **TanStack Router 1.136+**: Type-safe routing
  - URL: https://tanstack.com/router
  - Version: 1.136.8
  - Purpose: File-based routing with type safety

- **TanStack Router Devtools**: Development tools
  - Version: 1.136.8
  - Purpose: Route debugging and visualization

### State Management

- **TanStack Query 5.84+**: Server state management
  - URL: https://tanstack.com/query
  - Version: 5.84.2
  - Purpose: Data fetching, caching, and synchronization

### Build Tools

- **Vite 7.1+**: Build tool and dev server
  - URL: https://vitejs.dev/
  - Version: 7.1.2
  - Purpose: Fast development server and optimized builds

- **SWC**: Fast compiler
  - URL: https://swc.rs/
  - Version: 1.13.3
  - Purpose: Fast TypeScript/JavaScript compilation

### Styling

- **TailwindCSS 3.4+**: Utility-first CSS framework
  - URL: https://tailwindcss.com/
  - Version: 3.4.17
  - Purpose: Rapid UI development with utility classes

- **Radix UI**: Unstyled, accessible components
  - URL: https://www.radix-ui.com/
  - Various packages (Dialog, Dropdown, etc.)
  - Purpose: Accessible, unstyled UI primitives

### Forms

- **React Hook Form 7.62+**: Form state management
  - URL: https://react-hook-form.com/
  - Version: 7.62.0
  - Purpose: Performant form handling

- **Zod 3.25+**: Schema validation
  - URL: https://zod.dev/
  - Version: 3.25.76
  - Purpose: TypeScript-first schema validation

### UI Components

- **Material-UI (MUI) 7.0+**: React component library
  - URL: https://mui.com/
  - Version: 7.0.0
  - Purpose: Pre-built UI components

- **Lucide React**: Icon library
  - URL: https://lucide.dev/
  - Version: 0.539.0
  - Purpose: Icon components

### Utilities

- **date-fns 4.1+**: Date manipulation
  - URL: https://date-fns.org/
  - Version: 4.1.0
  - Purpose: Date formatting and manipulation

- **clsx**: Conditional class names
  - URL: https://github.com/lukeed/clsx
  - Version: 2.1.1
  - Purpose: Utility for constructing className strings

## Development Tools

### Code Quality

- **Prettier**: Code formatter
  - Version: 3.6.2
  - Purpose: Consistent code formatting

- **ESLint**: Linting (via framework)
  - Purpose: Code quality and consistency

### Package Management

- **npm**: Node.js package manager
  - Version: Included with Node.js
  - Purpose: Frontend dependency management

- **pip**: Python package manager
  - Version: Included with Python
  - Purpose: Backend dependency management

## Production Deployment Stack

### Web Server

- **Nginx**: Reverse proxy and static file server
  - URL: https://nginx.org/
  - Purpose: SSL termination, static files, reverse proxy

### Process Management

- **systemd**: Service management
  - Purpose: Process management and auto-restart

### SSL/TLS

- **Certbot**: SSL certificate management
  - URL: https://certbot.eff.org/
  - Purpose: Automatic SSL certificate generation and renewal

## Development Environment

### Required Versions

- **Python**: 3.11 or later
- **Node.js**: 20 or later
- **npm**: Included with Node.js
- **PostgreSQL**: 12 or later (for production)
- **Git**: For version control

### Recommended Tools

- **VS Code**: Code editor
- **Postman/Insomnia**: API testing
- **pgAdmin/DBeaver**: Database management
- **Docker** (optional): Containerization

## Dependencies Summary

### Backend Dependencies

```
Django>=5.0,<6.0
djangorestframework>=3.15
djangorestframework-simplejwt>=5.3
django-cors-headers>=4.4
drf-spectacular>=0.27
django-ratelimit>=4.1.0
gunicorn>=23.0
psycopg[binary]>=3.2
pytest>=7.4.0
pytest-django>=4.7.0
pytest-cov>=4.1.0
```

### Frontend Dependencies

Key dependencies (see `Frontend/package.json` for complete list):

- React 19.2.0
- TypeScript 5.9.2
- TanStack Router 1.136.8
- TanStack Query 5.84.2
- Vite 7.1.2
- TailwindCSS 3.4.17
- React Hook Form 7.62.0
- Zod 3.25.76

## Technology Decisions

### Why Django?

- Mature, battle-tested framework
- Excellent ORM for complex data relationships
- Built-in admin interface for quick management
- Strong security features out of the box
- Large ecosystem and community support

### Why React?

- Component-based architecture fits UI needs
- Large ecosystem and community
- Strong TypeScript support
- Excellent developer experience
- Performance optimizations built-in

### Why TanStack Router?

- Type-safe routing with TypeScript
- File-based routing (similar to Next.js)
- Excellent developer experience
- Built-in data loading patterns

### Why TanStack Query?

- Excellent server state management
- Automatic caching and refetching
- Optimistic updates support
- Great developer experience

### Why PostgreSQL?

- Robust relational database
- Excellent performance
- ACID compliance
- Strong community support
- Production-ready features

## Related Documentation

- [Development Setup](05-Development-Setup.md) - Setting up development environment
- [Project Structure](04-Project-Structure.md) - Project organization
- [Deployment](19-Deployment.md) - Production deployment

