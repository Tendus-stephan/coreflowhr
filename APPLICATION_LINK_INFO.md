# Job Application Link Information

## Application Link Format

The job application link is automatically generated using `window.location.origin` in production, which means **you don't need to manually provide it** - it will automatically use your production domain.

### Link Format:

**Production URL:**
```
https://www.coreflowhr.com/jobs/apply/{jobId}
```

**With CV Upload Token (from Screening emails):**
```
https://www.coreflowhr.com/jobs/apply/{jobId}?token={cvUploadToken}
```

**Registration Link (from LinkedIn outreach):**
```
https://www.coreflowhr.com/candidates/register/{candidateId}?token={registrationToken}
```

### How It Works:

1. **Automatic URL Detection:**
   - In production: Uses `window.location.origin` → automatically becomes `https://www.coreflowhr.com`
   - In development: Uses `window.location.origin` → automatically becomes `http://localhost:5173`

2. **No Manual Configuration Needed:**
   - The system automatically detects the current domain
   - Registration links and CV upload links are generated dynamically
   - Works correctly in both development and production environments

3. **Where Links Are Generated:**
   - **Registration links**: `components/CandidateModal.tsx` line 347-348
   - **CV upload links**: `services/workflowEngine.ts` line 252-255
   - **Offer links**: `services/api.ts` lines 4626-4629, 5382-5385

### Testing:

To test the application page:
1. Visit: `https://www.coreflowhr.com/jobs/apply/{anyJobId}`
2. Or in development: `http://localhost:5173/jobs/apply/{jobId}`

The page will load and allow candidates to submit applications directly.
