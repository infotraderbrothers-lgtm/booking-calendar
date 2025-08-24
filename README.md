# Trader Brothers Booking System

## Overview

This is a comprehensive call booking system for "Trader Brothers Professional Trade Services" that allows customers to schedule video calls or mobile calls with the team. The system includes robust error handling, form validation, retry logic, and a modern, responsive design.

## File Structure

```
booking-system/
├── index.html          # Main HTML structure
├── styles.css          # CSS styling and animations
├── script.js           # JavaScript functionality
└── README.md           # This documentation
```

## Core Features

### 1. **User Interface Components**
- **Company Branding**: Professional header with gradient styling
- **Form Fields**: Name input, date picker, time selector, call type selection
- **Phone Management**: Automatic phone detection simulation and custom input
- **Status Screens**: Loading, success, and error screens with animations

### 2. **Form Validation**
- **Name Validation**: 2-50 characters, letters/spaces/hyphens/apostrophes only
- **Date Validation**: Weekdays only, no past dates, max 90 days ahead
- **Time Validation**: Business hours only (9 AM - 5 PM)
- **Phone Validation**: Required for mobile calls, international format support
- **Real-time Feedback**: Instant validation with visual error indicators

### 3. **Call Type Options**
- **Video Call**: Standard video conference booking
- **Mobile Call**: Phone call with number confirmation system
  - Auto-detects phone number (simulated)
  - Allows confirmation or custom number entry
  - Validates phone format

### 4. **Error Handling & Recovery**
- **Network Errors**: Automatic retry with exponential backoff
- **Timeout Management**: 30-second request timeout with user feedback
- **Offline Detection**: Network status monitoring
- **Retry Logic**: Up to 3 attempts with detailed error reporting
- **Support Contact**: Automated email generation for help requests

### 5. **Data Processing**
- **Input Sanitization**: XSS protection and data cleaning
- **Booking ID Generation**: Unique timestamp-based identifiers
- **Timezone Detection**: Automatic user timezone capture
- **Webhook Integration**: Submits to Make.com automation platform

## Technical Implementation

### HTML Structure (`index.html`)
```html
<!-- Key sections -->
<div class="container">
  <div class="header">                    <!-- Branding -->
  <form id="bookingForm">                 <!-- Main form -->
  <div id="loadingScreen">                <!-- Loading state -->
  <div id="errorScreen">                  <!-- Error handling -->
  <div id="successScreen">                <!-- Confirmation -->
</div>
```

### CSS Styling (`styles.css`)
- **Modern Design**: Glassmorphism effects, gradients, shadows
- **Responsive Layout**: Mobile-first approach with breakpoints
- **Animations**: Smooth transitions, loading spinners, slide effects
- **Visual Feedback**: Error states, hover effects, status indicators
- **Accessibility**: High contrast, semantic structure

### JavaScript Functionality (`script.js`)

#### Configuration
```javascript
const CONFIG = {
    MAKE_WEBHOOK_URL: 'webhook-endpoint',
    MAX_RETRIES: 3,
    TIMEOUT_MS: 30000,
    BUSINESS_HOURS: { start: 9, end: 17 },
    BLOCKED_DAYS: [0, 6], // Weekend blocking
    MAX_DAYS_AHEAD: 90
};
```

#### Key Functions

1. **Validation Functions**
   - `validateName()`: Name format and length checking
   - `validateDate()`: Business rules and date logic
   - `validateTime()`: Business hours enforcement
   - `validatePhone()`: International phone format validation

2. **UI Management**
   - `selectCallType()`: Handle call type selection
   - `confirmPhone()`: Phone number confirmation flow
   - `showLoadingScreen()`: Display processing state
   - `showSuccessScreen()`: Booking confirmation display
   - `showErrorScreen()`: Error handling with retry options

3. **Network Operations**
   - `submitBookingData()`: Main submission with error handling
   - `submitWithTimeout()`: Promise-based timeout wrapper
   - `retryBooking()`: Automatic retry logic

4. **Utility Functions**
   - `generateBookingId()`: Unique identifier creation
   - `formatTime()/formatDate()`: Display formatting
   - `sanitizeInput()`: XSS protection

## Business Logic

### Booking Rules
- **Operating Days**: Monday through Friday only
- **Business Hours**: 9:00 AM to 5:00 PM
- **Advance Booking**: Up to 90 days in advance
- **Same Day**: Bookings allowed if during business hours
- **Time Slots**: 30-minute intervals available

### Call Types
1. **Video Call**: No additional information required
2. **Mobile Call**: Requires phone number confirmation
   - System simulates phone detection
   - Users can confirm detected number or enter custom
   - Validates international phone formats

### Data Flow
1. User fills form → 2. Client-side validation → 3. Data sanitization → 
4. Booking ID generation → 5. Webhook submission → 6. Success/Error handling

## Error Handling Strategy

### Client-Side Validation
- Real-time field validation
- Visual error indicators
- Prevent invalid submissions

### Network Error Recovery
- **Timeout Errors**: 30-second limit with retry
- **Network Failures**: Automatic retry with backoff
- **Server Errors**: User notification with support contact
- **Offline Mode**: Detection with user guidance

### User Experience
- **Loading States**: Clear progress indication
- **Error Messages**: Specific, actionable feedback
- **Retry Options**: Manual and automatic recovery
- **Support Contact**: One-click email generation

## Security Features

### Input Sanitization
```javascript
function sanitizeInput(input) {
    return input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/[<>]/g, '')
                .trim();
}
```

### Data Validation
- Pattern matching for names and phones
- Date range enforcement
- Input length restrictions
- Type checking for all fields

## Responsive Design

### Mobile Optimization
- Touch-friendly interface
- Collapsible sections
- Optimized button sizes
- Single-column layout on mobile

### Desktop Features
- Two-column call type selection
- Hover effects and animations
- Larger form elements
- Enhanced visual feedback

## Integration Points

### Make.com Webhook
- Endpoint: `https://hook.eu2.make.com/969nskx4hbgd2nn4wh1p4a15rh0630v1`
- Method: POST
- Content-Type: application/json
- Includes: User data, booking details, system metadata

### Data Payload
```javascript
{
    bookingId: "TB-1234567890-ABCDE",
    name: "John Doe",
    date: "2024-03-15",
    time: "14:00",
    callType: "video",
    phoneNumber: null,
    timestamp: "2024-03-01T10:00:00.000Z",
    timezone: "America/New_York",
    userAgent: "browser-info",
    referrer: "direct"
}
```

## Usage Instructions

### For Developers
1. Ensure all three files are in the same directory
2. Update webhook URL in `script.js` if needed
3. Customize business rules in CONFIG object
4. Test form validation and error handling
5. Verify mobile responsiveness

### For Users
1. Enter full name (required)
2. Select date (weekdays only, up to 90 days ahead)
3. Choose time slot (business hours only)
4. Select call type (video or mobile)
5. Confirm phone number if mobile call selected
6. Submit and wait for confirmation

## Browser Compatibility
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)
- Requires JavaScript enabled
- Uses modern CSS features (Grid, Flexbox, Custom Properties)

## Performance Considerations
- Minimal external dependencies
- Optimized animations with CSS transforms
- Efficient DOM manipulation
- Lazy loading of error states
- Debounced validation for better UX

## Future Enhancements
- Calendar integration (Google Calendar, Outlook)
- SMS confirmation system
- Multi-language support
- Advanced time zone handling
- Payment integration for premium services
- Admin dashboard for booking management
