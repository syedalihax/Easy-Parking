# EasyParking Project Plan

## Project name
EasyParking

## Purpose
A parking business management app for managing customers, vehicles, subscriptions, dues, payments, daily parking activity, and reports for parking operators.

## Scope
- Marketing/landing page: Next.js-based, SEO-friendly, conversion-focused
- Logged-in application: existing React app remains in place for now
- Business workflow: parking owner/manager operations dashboard and daily management

## Tech stack
### Confirmed direction
- Landing page: Next.js
- App/dashboard: React + Vite (current app remains)
- Backend: Node.js + Express
- Database: MongoDB + Mongoose
- Auth: JWT in HttpOnly cookies
- Styling: custom design system + Tailwind-ready styling approach
- Localization: i18n with RTL support
- PWA: supported in the React app

## Branding direction
### Brand goal
Premium fintech + SaaS feel that feels trustworthy, clean, and easy to use.

### Confirmed visual direction
- Primary: deep forest green, used for trust and operational stability
- Accent: warm clay / terracotta, used for selective emphasis and tactile warmth
- Background: warm ivory / stone, to feel premium and less synthetic than generic white/blue SaaS themes
- Text: deep slate / charcoal for clarity and contrast
- Buttons: bold, rounded, grounded, and high-contrast without neon saturation
- Style: warm-minimal, operationally premium, mobile-first, editorially structured

### Design principles
- No generic AI template layout
- No default Tailwind blue/indigo look
- Use intentional spacing, contrast, and hierarchy
- Keep dashboard app-like and practical
- Keep landing page marketing-focused and conversion-driven

## Landing page structure
### Page type
Single-page landing page with strong sections and clear CTA flow.

### Planned sections
1. Hero section with big headline, subheading, primary CTA, secondary CTA
2. Trust/social proof strip
3. Problem vs solution comparison
4. Core features section
5. Product preview / dashboard mockup section
6. Benefits section
7. FAQ / process section
8. Final CTA / signup section
9. Footer with links and contact info

## Dashboard / app hierarchy
### Core screens
- Dashboard
- Customers
- Vehicles
- Dues
- Payments
- Daily Parking
- Reports
- Team / access control
- Profile / settings
- Inbox / invitations

### App UX pattern
- Top summary card for metrics
- Quick actions grid below summary
- Recent activity feed
- Sidebar navigation for desktop
- Bottom navigation for mobile
- Clean list layouts for records and payments

## UI design tokens
### Colors
- primary: #1BAA75
- secondary: #6D5EF7
- accent: #EAFBF4
- background: #F8FAFC
- text: #111827
- muted: #6B7280
- border: #E5E7EB

### Typography
- Heading font: modern sans-serif (clean, bold, premium)
- Body font: readable sans-serif
- Base size: 16px
- Scale ratio: 1.2

### Radius and spacing
- Card radius: 18px
- Button radius: 14px
- Small spacing: 8px
- Medium spacing: 16px
- Large spacing: 24px
- Extra large spacing: 32px

## Features status
### ✅ Done
- App foundation and backend API structure
- Auth and role-based access flow
- Parking membership creation
- Customer and vehicle management
- Payments and due logic
- Per-vehicle daily fee tracking with no fixed parking-wide rate
- Dashboard and reporting structure
- Multi-language support and RTL support
- PWA support
- Landing page marketing design already exists in React

### 🔄 In progress
- UI redesign to be more premium and consistent
- Landing page migration to Next.js for SEO
- Refining visual hierarchy and brand polish

### 📋 Planned
- Final custom branding assets/logo/favicon
- Full landing-page SEO optimization in Next.js
- Better app-wide visual consistency across screens
- Product polish and mobile UX tuning

## Required env and configs
- MongoDB URI
- JWT secret
- JWT expiration config
- API base URL for frontend
- Hosting/domain details for production
- Optional: analytics/monitoring service if later added

## Key constraints
- SEO is a priority only for marketing/landing page
- Logged-in app functionality remains in current React app for now
- No generic default AI design patterns
- Design should feel trustworthy and premium, not overly decorative
- Decisions should be user-approved before broad visual changes
