# Smart SOS+ - Troubleshooting & FAQ

## Common Issues & Solutions

### Backend Issues

#### 1. MongoDB Connection Error
**Error**: `MongooseError: Cannot connect to MongoDB`

**Solutions**:
```bash
# Check if MongoDB is running
# macOS
brew services list

# Windows - Check Services
services.msc

# Linux
sudo systemctl status mongod

# Start MongoDB if not running
# macOS
brew services start mongodb-community

# Windows
net start MongoDB

# Linux
sudo systemctl start mongod
```

**Alternative**: Use MongoDB Atlas (cloud)
```bash
# Update .env
MONGODB_URI=mongodb+srv://username:password@your-cluster.mongodb.net/smart-sos
```

---

#### 2. Port Already in Use
**Error**: `listen EADDRINUSE: address already in use :::5000`

**Solutions**:
```bash
# Find what's using port 5000
# macOS/Linux
lsof -i :5000

# Windows (PowerShell)
Get-NetTCPConnection -LocalPort 5000

# Kill the process (macOS/Linux)
kill -9 <PID>

# Or use different port in .env
PORT=5001
```

---

#### 3. JWT Secret Error
**Error**: `TypeError: JWT_SECRET is undefined`

**Solutions**:
```bash
# Generate JWT_SECRET
openssl rand -base64 32

# Add to .env
JWT_SECRET=your-generated-secret

# Or generate in Node
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

#### 4. CORS Error
**Error**: `Access to XMLHttpRequest blocked by CORS policy`

**Solutions**:
```bash
# Update .env
CORS_ORIGIN=http://localhost:19006  # For Expo web
CORS_ORIGIN=http://192.168.1.100:19006  # For physical device

# Update server/server.js if needed
app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true
}));
```

---

### Frontend Issues

#### 5. "Cannot Connect to Server"
**Error**: `Failed to fetch /api/auth/register`

**Causes**: Wrong API URL or backend not running

**Solutions**:
```bash
# 1. Verify backend is running
# In terminal at server folder
npm run dev  # Should see "Server running on port 5000"

# 2. Check EXPO_PUBLIC_API_URL
# In client/.env
EXPO_PUBLIC_API_URL=http://localhost:5000/api

# 3. For physical device on same network
# Find your machine IP
ifconfig | grep inet

# Update .env
EXPO_PUBLIC_API_URL=http://192.168.1.X:5000/api
```

---

#### 6. Location Permission Denied
**Error**: `Cannot get location - permission denied`

**Solutions**:
1. **Grant Permissions**
   - iOS: Settings > Smart SOS+ > Location > Always Allow
   - Android: Settings > Apps > Smart SOS+ > Permissions > Location

2. **Test with simulator**
   ```bash
   # iOS Simulator
   Features > Location > Custom Location

   # Android Emulator
   Extended Controls > Location
   ```

3. **Request fresh permissions**
   ```javascript
   // In code
   await Location.requestForegroundPermissionsAsync();
   ```

---

#### 7. Accelerometer Not Working
**Error**: `Sensor not available on device`

**Solutions**:
1. **Test on physical device** (simulators have limited sensor support)
2. **Check if enabled**
   ```bash
   # Android: Settings > Sensors
   # iOS: Sensors are always available
   ```
3. **Verify code**
   ```javascript
   import { Accelerometer } from 'expo-sensors';
   // Check in hooks/useFallDetection.js
   ```

---

#### 8. AsyncStorage Issues
**Error**: `AsyncStorage.getItem is not a function`

**Solution**:
```bash
# Ensure correct import
import * as AsyncStorage from 'expo-async-storage';
// NOT: import AsyncStorage from '@react-native-async-storage/async-storage';
```

---

#### 9. Navigation Not Working
**Error**: `Cannot navigate to screen`

**Solutions**:
```bash
# Check RootNavigator.js exists
# Verify screen names match exactly
# Check all imports are correct

# Example fix:
# In RootNavigator.js
<Tab.Screen
  name="Home"  // Must match exactly
  component={HomeStack}
/>
```

---

#### 10. Blank White Screen
**Error**: App shows white screen on start

**Solutions**:
```bash
# 1. Check console for errors
# Ctrl+Shift+J in browser or Expo app

# 2. Force reload
# Shake device or press 'r' in Expo

# 3. Clear Expo cache
expo cache clean

# 4. Reinstall dependencies
rm -rf node_modules
npm install

# 5. Check app.json is valid
npm start -- --clear
```

---

## API Testing

### Using cURL

```bash
# Register User
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name":"John Doe",
    "phone":"9876543210",
    "password":"password123"
  }'

# Login (get token)
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone":"9876543210",
    "password":"password123"
  }'

# Get Profile (replace TOKEN with actual token)
curl http://localhost:5000/api/user/profile \
  -H "Authorization: Bearer TOKEN"

# Trigger Emergency
curl -X POST http://localhost:5000/api/emergency/trigger \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "type":"manual",
    "latitude":28.6139,
    "longitude":77.2090
  }'
```

### Using Postman

1. **Create Collection**
   - File > New Collection > Smart SOS+

2. **Add Variables**
   - base_url: `http://localhost:5000/api`
   - token: (add from login response)

3. **Test Endpoint**
   - Method: POST
   - URL: `{{base_url}}/auth/register`
   - Body (JSON):
   ```json
   {
     "name": "Test User",
     "phone": "1234567890",
     "password": "password123"
   }
   ```

---

## Performance Issues

### Slow API Response
**Solutions**:
```bash
# 1. Check database query performance
# Use MongoDB Compass to identify slow queries

# 2. Add database indexes
# In models/User.js
userSchema.index({ phone: 1 });

# 3. Optimize Express
# Add compression middleware
app.use(compression());

# 4. Check network latency
# See Network tab in DevTools
```

### Memory Leaks
**Solutions**:
```bash
# 1. Check for uncleared intervals
clearInterval(timer);

# 2. Unsubscribe from subscriptions
subscription.remove();

# 3. Clean up effects
useEffect(() => {
  const subscription = Accelerometer.addListener(data => {});
  return () => subscription.remove();
}, []);
```

### App Crashes
**Solutions**:
```bash
# 1. Check console errors
# In Expo app or browser console

# 2. Add error boundary
# In App.js
try {
  return <RootNavigator />;
} catch (error) {
  return <ErrorScreen error={error} />;
}

# 3. Check for null references
if (!data) return null;
```

---

## Testing Checklist

### Backend Testing
- [ ] Server starts without errors
- [ ] MongoDB connects successfully
- [ ] POST /auth/register creates user
- [ ] POST /auth/login returns token
- [ ] GET /user/profile with token works
- [ ] PUT /user/profile updates data
- [ ] POST /contacts creates contact
- [ ] GET /contacts lists contacts
- [ ] POST /emergency/trigger works
- [ ] Mock SMS is logged

### Frontend Testing
- [ ] App starts without errors
- [ ] Login/Register screens appear
- [ ] Can register new account
- [ ] Can login with credentials
- [ ] Can add emergency contact
- [ ] Can view contacts list
- [ ] SOS button responds to touch
- [ ] Location permission works
- [ ] Fall detection triggers modal
- [ ] Profile screen updates work

---

## Debugging Tips

### Backend Debugging

```javascript
// Add console logs
console.log('Received request:', req.body);
console.log('User found:', user);
console.log('Token generated:', token);

// Check request headers
console.log('Authorization:', req.headers.authorization);

// Log errors properly
console.error('Error details:', error.message, error.stack);

// Use debugger
// In package.json scripts:
"debug": "node --inspect server.js"
```

### Frontend Debugging

```javascript
// Check API calls
console.log('API Call:', method, url);
console.log('Response:', response.data);

// Log state changes
useEffect(() => {
  console.log('User changed:', user);
}, [user]);

// Check props
console.log('Screen props:', route.params);

// React DevTools
// Install React Native DevTools extension
```

---

## FAQ - Frequently Asked Questions

### Q: Can I use the app without internet?
**A**: No, the app requires internet to:
- Authenticate users
- Send emergency alerts
- Get live location
- Fetch contacts

Offline functionality can be added with local storage.

---

### Q: How do I change the SOS button color?
**A**: Edit `client/src/components/UI.js`:
```javascript
export const colors = {
  red: '#E74C3C',  // Change this
};
```

---

### Q: How do I implement real SMS with Twilio?
**A**: In `server/utils/sms.js`:
```javascript
const twilio = require('twilio');
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const sendSMS = async (phoneNumber, message) => {
  return client.messages.create({
    body: message,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: phoneNumber,
  });
};
```

---

### Q: How long is the JWT token valid?
**A**: 7 days by default. Change in `server/utils/jwt.js`:
```javascript
jwt.sign(userId, secret, { expiresIn: '30d' });  // 30 days
```

---

### Q: Can I customize the UI colors?
**A**: Yes, edit `client/src/components/UI.js`:
```javascript
export const colors = {
  primary: '#000000',  // Black
  secondary: '#666666',
  red: '#E74C3C',
  // ... etc
};
```

---

### Q: How do I test fall detection without falling?
**A**: Can't really simulate falling. Options:
1. Test on physical device with real movement
2. Mock the hook in development
3. Adjust acceleration threshold temporarily

---

### Q: What if I forget the admin password?
**A**: This app has no admin. Each user manages their own account.

You can:
1. Delete user from MongoDB: `db.users.deleteOne({phone: '...' })`
2. Re-register with same phone
3. Or reset password endpoint (can be added)

---

### Q: Is there a web version?
**A**: Run `npm start` in client folder and press 'w' for web.
Features vary due to browser limitations (no Sensors API, Location limited).

---

## Performance Optimization

### Backend
```javascript
// 1. Add indexes
userSchema.index({ phone: 1, createdAt: -1 });

// 2. Limit query results
contacts = await EmergencyContact.find()
  .limit(100)
  .lean();  // Don't hydrate full mongoose documents

// 3. Cache responses
app.use(cacheMiddleware);

// 4. Compress responses
app.use(compression());
```

### Frontend
```javascript
// 1. Memoize components
const HomeScreen = React.memo(() => {});

// 2. Use FlatList for lists
<FlatList keyExtractor={(item) => item._id} />

// 3. Optimize images
<Image
  source={require('./icon.png')}
  size={100}
/>

// 4. Debounce API calls
const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};
```

---

## Getting Help

1. **Check Logs**
   - Backend: Terminal output
   - Frontend: Expo DevTools, Browser Console

2. **Search Issues**
   - GitHub issues
   - Stack Overflow
   - Expo Discord

3. **Debug Tools**
   - React DevTools
   - React Native Debugger
   - MongoDB Compass

4. **Test API**
   - Postman
   - Insomnia
   - Thunder Client (VS Code)

---

## Support Resources

- **Expo Documentation**: https://docs.expo.dev
- **React Native**: https://reactnative.dev
- **Express.js**: https://expressjs.com
- **MongoDB**: https://docs.mongodb.com
- **React Navigation**: https://reactnavigation.org

---

**Last Updated**: March 2, 2024  
**Version**: 1.0.0

**Remember**: Read error messages carefully! They usually tell you exactly what's wrong. 🔍
