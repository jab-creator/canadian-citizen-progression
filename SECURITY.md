# Security Policy

## Reporting Security Vulnerabilities

If you discover a security vulnerability in this project, please report it by opening a GitHub issue or contacting the repository owner directly.

## Firebase API Key Security

### Important Notes

**Firebase API keys in client-side code are not secret by design.** Firebase uses security rules on the backend to protect your data, not API key secrecy. However, you should still:

1. **Always restrict your API keys** in the Google Cloud Console
2. **Enable Firebase Security Rules** for Firestore and Authentication
3. **Never commit your actual Firebase config** to public repositories

### Protecting Your Firebase Configuration

This repository includes a safe placeholder `firebase-config.js` that is tracked by Git:

1. **firebase-config.js** - Safe placeholder (committed to repo)
2. **firebase-config.template.js** - Alternative template file

### Setup Instructions

1. Edit `firebase-config.js` directly:
   ```bash
   nano firebase-config.js
   # Uncomment the config section and add your Firebase credentials
   ```

2. Get your credentials from the [Firebase Console](https://console.firebase.google.com/)

3. **Prevent committing your credentials**:
   ```bash
   # Tell Git to ignore local changes to this file
   git update-index --skip-worktree firebase-config.js
   
   # To undo this later:
   git update-index --no-skip-worktree firebase-config.js
   ```

### If Your API Key is Exposed

If you accidentally commit your Firebase API key to a public repository:

1. **Regenerate the API key** in Google Cloud Console:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Navigate to "APIs & Services" > "Credentials"
   - Find your exposed key and regenerate it

2. **Add API Key restrictions**:
   - HTTP referrers (websites) - restrict to your domain(s)
   - Application restrictions - limit to specific APIs
   - Review the [API Key Best Practices](https://cloud.google.com/docs/authentication/api-keys)

3. **Update your Firebase Security Rules**:
   - Ensure Firestore rules properly authenticate users
   - Review Authentication settings
   - Check that anonymous access is disabled if not needed

4. **Update your local firebase-config.js** with the new key

5. **Remove the exposed key from Git history** if needed:
   ```bash
   # Use git filter-branch or BFG Repo-Cleaner
   # See: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository
   ```

### Google Cloud Security Best Practices

- **Enable billing alerts** to detect unusual usage
- **Monitor API usage** in the Google Cloud Console
- **Use Firebase Security Rules** to control data access
- **Enable App Check** for additional protection
- **Review audit logs** regularly

## Local-Only Mode

The app works perfectly fine without Firebase configuration:
- All data is stored in browser localStorage
- No cloud features are available
- No API keys are required
- Perfect for privacy-conscious users

## Additional Resources

- [Firebase Security Checklist](https://firebase.google.com/support/guides/security-checklist)
- [API Key Best Practices](https://cloud.google.com/docs/authentication/api-keys)
- [Firebase Security Rules](https://firebase.google.com/docs/rules)
