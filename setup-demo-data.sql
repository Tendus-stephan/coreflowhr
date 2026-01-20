-- Setup Demo Data for coreflowhr@gmail.com
-- Run this script in Supabase SQL Editor
-- This will create jobs, candidates, workflows, and other demo data

-- Step 1: Get the user ID for coreflowhr@gmail.com
DO $$
DECLARE
    demo_user_id UUID;
    demo_user_email TEXT := 'coreflowhr@gmail.com';
    
    -- Job IDs
    job_software_engineer UUID;
    job_marketing_manager UUID;
    job_business_analyst UUID;
    
    -- Workflow IDs
    workflow_screening UUID;
    workflow_offer UUID;
    workflow_hired UUID;
    workflow_rejected UUID;
BEGIN
    -- Get user ID
    SELECT id INTO demo_user_id
    FROM auth.users
    WHERE email = demo_user_email
    LIMIT 1;

    IF demo_user_id IS NULL THEN
        RAISE EXCEPTION 'User with email % not found. Please ensure the account exists.', demo_user_email;
    END IF;

    RAISE NOTICE 'Found user ID: %', demo_user_id;

    -- Step 2: Create Demo Jobs
    RAISE NOTICE 'Creating demo jobs...';

    -- Job 1: Senior Software Engineer (Active)
    INSERT INTO jobs (
        id,
        user_id,
        title,
        department,
        location,
        type,
        status,
        description,
        skills,
        experience_level,
        posted_date,
        created_at,
        updated_at,
        scraping_status
    ) VALUES (
        gen_random_uuid(),
        demo_user_id,
        'Senior Software Engineer',
        'Engineering',
        'Remote',
        'Full-time',
        'Active',
        'We are looking for an experienced Senior Software Engineer to join our engineering team. You will be responsible for designing and implementing scalable software solutions, mentoring junior developers, and collaborating with cross-functional teams.',
        ARRAY['JavaScript', 'TypeScript', 'React', 'Node.js', 'AWS', 'PostgreSQL', 'Docker', 'Kubernetes']::TEXT[],
        'Senior Level (5+ years)',
        CURRENT_DATE - INTERVAL '5 days',
        NOW(),
        NOW(),
        'succeeded'
    ) RETURNING id INTO job_software_engineer;

    -- Job 2: Marketing Manager (Active)
    INSERT INTO jobs (
        id,
        user_id,
        title,
        department,
        location,
        type,
        status,
        description,
        skills,
        experience_level,
        posted_date,
        created_at,
        updated_at,
        scraping_status
    ) VALUES (
        gen_random_uuid(),
        demo_user_id,
        'Marketing Manager',
        'Marketing',
        'New York, NY',
        'Full-time',
        'Active',
        'We seek a Marketing Manager to lead our marketing initiatives, develop strategic campaigns, and manage our brand presence across multiple channels.',
        ARRAY['Digital Marketing', 'SEO', 'Content Marketing', 'Social Media', 'Analytics', 'Campaign Management']::TEXT[],
        'Mid Level (2-5 years)',
        CURRENT_DATE - INTERVAL '3 days',
        NOW(),
        NOW(),
        'succeeded'
    ) RETURNING id INTO job_marketing_manager;

    -- Job 3: Business Analyst (Draft)
    INSERT INTO jobs (
        id,
        user_id,
        title,
        department,
        location,
        type,
        status,
        description,
        skills,
        experience_level,
        posted_date,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        demo_user_id,
        'Business Analyst',
        'Product',
        'San Francisco, CA',
        'Full-time',
        'Draft',
        'Looking for a Business Analyst to analyze business processes, gather requirements, and translate business needs into technical solutions.',
        ARRAY['Requirements Gathering', 'Data Analysis', 'SQL', 'Excel', 'Process Mapping', 'Stakeholder Management']::TEXT[],
        'Mid Level (2-5 years)',
        CURRENT_DATE,
        NOW(),
        NOW()
    ) RETURNING id INTO job_business_analyst;

    RAISE NOTICE 'Created jobs: Software Engineer (%), Marketing Manager (%), Business Analyst (%)', 
                 job_software_engineer, job_marketing_manager, job_business_analyst;

    -- Step 3: Create Email Workflows
    RAISE NOTICE 'Creating email workflows...';

    -- Get email template IDs (assuming they exist from default templates)
    -- Screening workflow
    INSERT INTO email_workflows (
        id,
        user_id,
        name,
        trigger_stage,
        email_template_id,
        enabled,
        delay_minutes,
        created_at,
        updated_at
    )
    SELECT 
        gen_random_uuid(),
        demo_user_id,
        'Screening Workflow',
        'Screening',
        et.id,
        true,
        0,
        NOW(),
        NOW()
    FROM email_templates et
    WHERE et.user_id = demo_user_id 
      AND et.type = 'Screening'
    LIMIT 1
    RETURNING id INTO workflow_screening;

    -- Offer workflow
    INSERT INTO email_workflows (
        id,
        user_id,
        name,
        trigger_stage,
        email_template_id,
        enabled,
        delay_minutes,
        created_at,
        updated_at
    )
    SELECT 
        gen_random_uuid(),
        demo_user_id,
        'Offer Workflow',
        'Offer',
        et.id,
        true,
        0,
        NOW(),
        NOW()
    FROM email_templates et
    WHERE et.user_id = demo_user_id 
      AND et.type = 'Offer'
    LIMIT 1
    RETURNING id INTO workflow_offer;

    -- Hired workflow
    INSERT INTO email_workflows (
        id,
        user_id,
        name,
        trigger_stage,
        email_template_id,
        enabled,
        delay_minutes,
        created_at,
        updated_at
    )
    SELECT 
        gen_random_uuid(),
        demo_user_id,
        'Hired Workflow',
        'Hired',
        et.id,
        true,
        0,
        NOW(),
        NOW()
    FROM email_templates et
    WHERE et.user_id = demo_user_id 
      AND et.type = 'Hired'
    LIMIT 1
    RETURNING id INTO workflow_hired;

    -- Rejected workflow
    INSERT INTO email_workflows (
        id,
        user_id,
        name,
        trigger_stage,
        email_template_id,
        enabled,
        delay_minutes,
        created_at,
        updated_at
    )
    SELECT 
        gen_random_uuid(),
        demo_user_id,
        'Rejected Workflow',
        'Rejected',
        et.id,
        true,
        0,
        NOW(),
        NOW()
    FROM email_templates et
    WHERE et.user_id = demo_user_id 
      AND et.type = 'Rejection'
    LIMIT 1
    RETURNING id INTO workflow_rejected;

    RAISE NOTICE 'Created workflows';

    -- Step 4: Create Demo Candidates
    RAISE NOTICE 'Creating demo candidates...';

    -- Candidates for Software Engineer job
    -- New stage (no email)
    INSERT INTO candidates (
        id,
        user_id,
        job_id,
        name,
        email,
        role,
        stage,
        source,
        skills,
        experience,
        location,
        ai_match_score,
        ai_analysis,
        profile_url,
        applied_date,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        demo_user_id,
        job_software_engineer,
        'Sarah Chen',
        NULL,
        'Senior Software Engineer',
        'New',
        'scraped',
        ARRAY['JavaScript', 'React', 'Node.js', 'AWS']::TEXT[],
        6,
        'San Francisco, CA',
        87,
        'Strong background in full-stack development with React and Node.js. Experienced with cloud infrastructure and microservices architecture.',
        'https://www.linkedin.com/in/sarah-chen-demo',
        CURRENT_DATE - INTERVAL '2 days',
        NOW(),
        NOW()
    );

    INSERT INTO candidates (
        id,
        user_id,
        job_id,
        name,
        email,
        role,
        stage,
        source,
        skills,
        experience,
        location,
        ai_match_score,
        ai_analysis,
        profile_url,
        applied_date,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        demo_user_id,
        job_software_engineer,
        'Michael Rodriguez',
        NULL,
        'Senior Software Engineer',
        'New',
        'scraped',
        ARRAY['TypeScript', 'React', 'PostgreSQL', 'Docker']::TEXT[],
        7,
        'Austin, TX',
        82,
        'Experienced software engineer with strong TypeScript skills and database expertise. Good fit for senior role.',
        'https://www.linkedin.com/in/michael-rodriguez-demo',
        CURRENT_DATE - INTERVAL '1 day',
        NOW(),
        NOW()
    );

    -- Screening stage (with email)
    INSERT INTO candidates (
        id,
        user_id,
        job_id,
        name,
        email,
        role,
        stage,
        source,
        skills,
        experience,
        location,
        ai_match_score,
        ai_analysis,
        profile_url,
        applied_date,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        demo_user_id,
        job_software_engineer,
        'Emily Johnson',
        'emily.johnson@example.com',
        'Senior Software Engineer',
        'Screening',
        'scraped',
        ARRAY['JavaScript', 'React', 'Node.js', 'AWS', 'Kubernetes']::TEXT[],
        8,
        'Seattle, WA',
        91,
        'Excellent candidate with extensive experience in React and cloud technologies. Strong technical skills match job requirements perfectly.',
        'https://www.linkedin.com/in/emily-johnson-demo',
        CURRENT_DATE - INTERVAL '5 days',
        NOW(),
        NOW()
    );

    -- Interview stage
    INSERT INTO candidates (
        id,
        user_id,
        job_id,
        name,
        email,
        role,
        stage,
        source,
        skills,
        experience,
        location,
        ai_match_score,
        ai_analysis,
        profile_url,
        applied_date,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        demo_user_id,
        job_software_engineer,
        'David Kim',
        'david.kim@example.com',
        'Senior Software Engineer',
        'Interview',
        'direct_application',
        ARRAY['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Docker']::TEXT[],
        6,
        'Los Angeles, CA',
        89,
        'Strong technical background with full-stack experience. Good communication skills and team collaboration experience.',
        NULL,
        CURRENT_DATE - INTERVAL '7 days',
        NOW(),
        NOW()
    );

    -- Offer stage
    INSERT INTO candidates (
        id,
        user_id,
        job_id,
        name,
        email,
        role,
        stage,
        source,
        skills,
        experience,
        location,
        ai_match_score,
        ai_analysis,
        profile_url,
        applied_date,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        demo_user_id,
        job_software_engineer,
        'Jennifer Martinez',
        'jennifer.martinez@example.com',
        'Senior Software Engineer',
        'Offer',
        'direct_application',
        ARRAY['JavaScript', 'TypeScript', 'React', 'AWS', 'Kubernetes']::TEXT[],
        9,
        'Boston, MA',
        94,
        'Top-tier candidate with exceptional skills and extensive experience. Perfect match for senior engineering role.',
        NULL,
        CURRENT_DATE - INTERVAL '10 days',
        NOW(),
        NOW()
    );

    -- Hired stage
    INSERT INTO candidates (
        id,
        user_id,
        job_id,
        name,
        email,
        role,
        stage,
        source,
        skills,
        experience,
        location,
        ai_match_score,
        ai_analysis,
        profile_url,
        applied_date,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        demo_user_id,
        job_software_engineer,
        'Robert Taylor',
        'robert.taylor@example.com',
        'Senior Software Engineer',
        'Hired',
        'direct_application',
        ARRAY['TypeScript', 'React', 'Node.js', 'PostgreSQL']::TEXT[],
        7,
        'Chicago, IL',
        88,
        'Excellent candidate who has been hired. Strong technical skills and great cultural fit.',
        NULL,
        CURRENT_DATE - INTERVAL '15 days',
        NOW(),
        NOW()
    );

    -- Rejected stage
    INSERT INTO candidates (
        id,
        user_id,
        job_id,
        name,
        email,
        role,
        stage,
        source,
        skills,
        experience,
        location,
        ai_match_score,
        ai_analysis,
        profile_url,
        applied_date,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        demo_user_id,
        job_software_engineer,
        'Lisa Wang',
        'lisa.wang@example.com',
        'Software Engineer',
        'Rejected',
        'direct_application',
        ARRAY['JavaScript', 'React']::TEXT[],
        2,
        'Denver, CO',
        45,
        'Candidate has some relevant skills but insufficient experience for senior role.',
        NULL,
        CURRENT_DATE - INTERVAL '8 days',
        NOW(),
        NOW()
    );

    -- Candidates for Marketing Manager job
    INSERT INTO candidates (
        id,
        user_id,
        job_id,
        name,
        email,
        role,
        stage,
        source,
        skills,
        experience,
        location,
        ai_match_score,
        ai_analysis,
        profile_url,
        applied_date,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        demo_user_id,
        job_marketing_manager,
        'Amanda Williams',
        NULL,
        'Marketing Manager',
        'New',
        'scraped',
        ARRAY['Digital Marketing', 'SEO', 'Content Marketing', 'Social Media']::TEXT[],
        4,
        'New York, NY',
        78,
        'Strong background in digital marketing with proven track record in SEO and content marketing.',
        'https://www.linkedin.com/in/amanda-williams-demo',
        CURRENT_DATE - INTERVAL '1 day',
        NOW(),
        NOW()
    );

    INSERT INTO candidates (
        id,
        user_id,
        job_id,
        name,
        email,
        role,
        stage,
        source,
        skills,
        experience,
        location,
        ai_match_score,
        ai_analysis,
        profile_url,
        applied_date,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        demo_user_id,
        job_marketing_manager,
        'James Anderson',
        'james.anderson@example.com',
        'Marketing Manager',
        'Screening',
        'direct_application',
        ARRAY['Digital Marketing', 'SEO', 'Analytics', 'Campaign Management']::TEXT[],
        5,
        'New York, NY',
        85,
        'Experienced marketing professional with strong analytical skills and campaign management experience.',
        NULL,
        CURRENT_DATE - INTERVAL '4 days',
        NOW(),
        NOW()
    );

    RAISE NOTICE 'Demo data setup complete!';
    RAISE NOTICE 'Created:';
    RAISE NOTICE '  - 3 Jobs (2 Active, 1 Draft)';
    RAISE NOTICE '  - 4 Email Workflows (Screening, Offer, Hired, Rejected)';
    RAISE NOTICE '  - 9 Candidates across different stages';
    RAISE NOTICE '';
    RAISE NOTICE 'You can now log in as coreflowhr@gmail.com to see the demo data.';

END $$;