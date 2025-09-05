# Dreamworld TCG Deployment Guide

## Quick Start - Access the App

The app is currently running locally at: **http://localhost:8087**

## Deploy to Firebase Hosting (for worldwide access)

### 1. Firebase Project Setup
```bash
# Login to Firebase (you'll need a Google account)
firebase login

# Initialize the project (if not already done)
firebase init hosting
# Select your existing Firebase project: dreamworldtcg
# When prompted for public directory: enter "dist"
# Configure as single-page app: Yes
# Overwrite index.html: No
```

### 2. Build and Deploy
```bash
# Export the web build
npx expo export --platform web

# Deploy to Firebase
firebase deploy --only hosting
```

### 3. Alternative Deployment Options

#### Option A: Netlify (Free)
1. Go to netlify.com and sign up
2. Drag and drop the `dist` folder to deploy instantly
3. Get a public URL like `https://yourapp.netlify.app`

#### Option B: Vercel (Free)
1. Go to vercel.com and sign up
2. Import the GitHub repository or upload the `dist` folder
3. Get a public URL like `https://yourapp.vercel.app`

#### Option C: Firebase Hosting (Recommended)
- Free tier: 10GB storage, 10GB transfer/month
- Custom domain support
- HTTPS by default
- Global CDN
- URL will be like `https://dreamworldtcg.web.app`

## Current Features Working

✅ **Real Firebase Authentication** - Users can create accounts and log in
✅ **Cross-Device Game Sync** - Game states sync in real-time across devices
✅ **Match History** - All games are saved to Firebase
✅ **Deck Management** - Create and manage decks with Dreamseeker matching
✅ **Real-time Multiplayer** - Share game codes to play with friends

## Usage Instructions

1. **Create Account**: Register with email and password
2. **Create Game**: Click "Create Game", optionally select a deck
3. **Share Game Code**: Give the 6-character code to your opponent
4. **Join Game**: Your opponent enters the code to join
5. **Play**: Track morale and energy, use "Next Turn" to advance
6. **Real-time Updates**: All changes appear instantly on both devices

## Technology Stack

- **Frontend**: React Native Web (Expo)
- **Backend**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Real-time**: Firebase Firestore subscriptions
- **Deployment**: Firebase Hosting (or Netlify/Vercel)

## Accessing from Any Device

Once deployed to Firebase Hosting (or alternatives), you can:
- Access from any smartphone, tablet, or computer
- Share the URL with friends worldwide
- Use on multiple devices simultaneously
- Works on iOS, Android, Windows, Mac, Linux

## Firebase Configuration

The Firebase project is already set up with:
- Project ID: `dreamworldtcg`
- Authentication enabled
- Firestore database configured
- Web app configuration included

## Troubleshooting

If you see a blank screen:
1. Check browser console for errors
2. Ensure Firebase configuration is correct
3. Verify internet connection for Firebase services
4. Try clearing browser cache