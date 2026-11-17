const bcrypt = require('bcryptjs');
const { pool, query } = require('../config/db');

async function seed() {
  try {
    const existing = await query('SELECT COUNT(*) FROM users');
    if (parseInt(existing.rows[0].count, 10) > 0) {
      console.log('Database already seeded. Skipping.');
      return;
    }

    const hash = async (pw) => bcrypt.hash(pw, 10);

    const users = [
      { email: 'admin@demo.com', password: 'Admin@123', name: 'Admin User', role: 'admin' },
      { email: 'lead@demo.com', password: 'Lead@123', name: 'Test Lead', role: 'test-lead' },
      { email: 'tester@demo.com', password: 'Tester@123', name: 'QA Tester', role: 'tester' },
      { email: 'readonly@demo.com', password: 'Read@123', name: 'Read Only Viewer', role: 'read-only' },
      { email: 'tester2@demo.com', password: 'Tester@123', name: 'QA Tester Two', role: 'tester' },
    ];

    const userIds = {};
    for (const u of users) {
      const pw = await hash(u.password);
      const r = await query(
        `INSERT INTO users (email, password_hash, full_name, role)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [u.email, pw, u.name, u.role]
      );
      userIds[u.role === 'tester' && userIds.tester ? 'tester2' : u.role] = r.rows[0].id;
      if (u.email === 'tester@demo.com') userIds.tester = r.rows[0].id;
      if (u.email === 'tester2@demo.com') userIds.tester2 = r.rows[0].id;
      if (u.role === 'admin') userIds.admin = r.rows[0].id;
      if (u.role === 'test-lead') userIds['test-lead'] = r.rows[0].id;
      if (u.role === 'read-only') userIds['read-only'] = r.rows[0].id;
    }

    const project = await query(
      `INSERT INTO projects (name, description, version, status, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [
        'E-Commerce Platform',
        'End-to-end test project for the online shopping platform covering checkout, catalog, and auth flows.',
        '2.1.0',
        'active',
        userIds.admin,
      ]
    );
    const projectId = project.rows[0].id;

    const project2 = await query(
      `INSERT INTO projects (name, description, version, status, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [
        'Mobile Banking App',
        'Regression and smoke suite for mobile banking features.',
        '1.4.2',
        'active',
        userIds['test-lead'],
      ]
    );
    const projectId2 = project2.rows[0].id;

    for (const uid of Object.values(userIds)) {
      await query(
        `INSERT INTO project_members (project_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [projectId, uid]
      );
    }
    for (const uid of [userIds.admin, userIds['test-lead'], userIds.tester, userIds['read-only']]) {
      await query(
        `INSERT INTO project_members (project_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [projectId2, uid]
      );
    }

    const suite1 = await query(
      `INSERT INTO test_suites (project_id, name, description, created_by)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [projectId, 'Authentication Suite', 'Login, logout, and password recovery', userIds['test-lead']]
    );
    const suite2 = await query(
      `INSERT INTO test_suites (project_id, name, description, created_by)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [projectId, 'Checkout Suite', 'Cart and payment flows', userIds['test-lead']]
    );
    const suite3 = await query(
      `INSERT INTO test_suites (project_id, name, description, created_by)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [projectId, 'Smoke Suite', 'Critical path smoke tests', userIds.admin]
    );

    const cases = [
      {
        title: 'User can login with valid credentials',
        description: 'Verify successful login with correct email and password',
        priority: 'Critical',
        type: 'Functional',
        pre: 'User account exists and is active',
        post: 'User is redirected to dashboard',
        tags: ['auth', 'smoke'],
        steps: [
          { action: 'Navigate to /login', expected: 'Login page is displayed' },
          { action: 'Enter valid email and password', expected: 'Fields accept input' },
          { action: 'Click Login', expected: 'User lands on dashboard with welcome message' },
        ],
      },
      {
        title: 'Login fails with invalid password',
        description: 'Verify error message on wrong password',
        priority: 'High',
        type: 'Functional',
        pre: 'User account exists',
        post: 'User remains on login page',
        tags: ['auth', 'negative'],
        steps: [
          { action: 'Enter valid email and wrong password', expected: 'Fields accept input' },
          { action: 'Click Login', expected: 'Error toast: Invalid credentials' },
        ],
      },
      {
        title: 'Add product to cart',
        description: 'User can add a product from catalog to shopping cart',
        priority: 'High',
        type: 'Functional',
        pre: 'User is logged in; product is in stock',
        post: 'Cart count increments by 1',
        tags: ['cart', 'checkout'],
        steps: [
          { action: 'Open product detail page', expected: 'Product info is shown' },
          { action: 'Click Add to Cart', expected: 'Success toast and cart badge updates' },
        ],
      },
      {
        title: 'Checkout with credit card',
        description: 'Complete purchase using credit card payment',
        priority: 'Critical',
        type: 'Integration',
        pre: 'Cart has at least one item; payment gateway is available',
        post: 'Order confirmation page is shown',
        tags: ['checkout', 'payment'],
        steps: [
          { action: 'Go to cart and click Checkout', expected: 'Checkout form loads' },
          { action: 'Fill shipping and card details', expected: 'Form validates' },
          { action: 'Submit payment', expected: 'Order confirmation with order ID' },
        ],
      },
      {
        title: 'Product search returns relevant results',
        description: 'Search bar filters catalog by keyword',
        priority: 'Medium',
        type: 'UI',
        pre: 'Catalog has products',
        post: 'Results match query',
        tags: ['search', 'catalog'],
        steps: [
          { action: 'Type "shoes" in search', expected: 'Suggestions appear' },
          { action: 'Press Enter', expected: 'Results page shows shoe products' },
        ],
      },
      {
        title: 'API: GET /products returns 200',
        description: 'Products list endpoint health check',
        priority: 'Medium',
        type: 'API',
        pre: 'API is running',
        post: 'JSON array of products returned',
        tags: ['api', 'smoke'],
        steps: [
          { action: 'Send GET /api/products', expected: 'Status 200 and products array' },
        ],
      },
      {
        title: 'Password reset email sent',
        description: 'Forgot password flow triggers email',
        priority: 'High',
        type: 'Functional',
        pre: 'User email is registered',
        post: 'Reset email queued',
        tags: ['auth', 'email'],
        steps: [
          { action: 'Click Forgot Password', expected: 'Reset form shown' },
          { action: 'Submit registered email', expected: 'Success message displayed' },
        ],
      },
      {
        title: 'Regression: Homepage loads under 2s',
        description: 'Performance smoke for homepage',
        priority: 'Low',
        type: 'Regression',
        pre: 'CDN cache warmed',
        post: 'LCP < 2s',
        tags: ['performance', 'smoke'],
        steps: [
          { action: 'Navigate to /', expected: 'Page interactive within 2 seconds' },
        ],
      },
      {
        title: 'Apply discount coupon',
        description: 'Valid coupon reduces cart total',
        priority: 'Medium',
        type: 'Functional',
        pre: 'Active coupon SAVE10 exists',
        post: '10% discount applied',
        tags: ['checkout', 'promo'],
        steps: [
          { action: 'Enter coupon SAVE10 at checkout', expected: 'Discount line item appears' },
          { action: 'Verify total', expected: 'Total is 10% less than subtotal' },
        ],
      },
      {
        title: 'Smoke: Critical navigation links',
        description: 'Top nav links resolve without 404',
        priority: 'Critical',
        type: 'Smoke',
        pre: 'App is deployed',
        post: 'All primary nav pages load',
        tags: ['smoke', 'nav'],
        steps: [
          { action: 'Click Home, Shop, Cart, Account', expected: 'Each page returns 200' },
        ],
      },
      {
        title: 'UI: Responsive cart drawer on mobile',
        description: 'Cart drawer opens correctly on mobile viewport',
        priority: 'Low',
        type: 'UI',
        pre: 'Viewport set to 375px',
        post: 'Drawer overlays content',
        tags: ['ui', 'mobile'],
        steps: [
          { action: 'Tap cart icon', expected: 'Drawer slides in from right' },
        ],
      },
      {
        title: 'Integration: Inventory sync after order',
        description: 'Stock decrements after successful order',
        priority: 'High',
        type: 'Integration',
        pre: 'Product stock > 0',
        post: 'Stock reduced by ordered qty',
        tags: ['inventory', 'integration'],
        steps: [
          { action: 'Place order for qty 1', expected: 'Order succeeds' },
          { action: 'Check inventory API', expected: 'Stock decreased by 1' },
        ],
      },
    ];

    const caseIds = [];
    for (let i = 0; i < cases.length; i++) {
      const c = cases[i];
      const assignee = i % 2 === 0 ? userIds.tester : userIds.tester2;
      const r = await query(
        `INSERT INTO test_cases
          (project_id, title, description, priority, type, pre_conditions, post_conditions, tags, assigned_to, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
        [
          projectId,
          c.title,
          c.description,
          c.priority,
          c.type,
          c.pre,
          c.post,
          c.tags,
          assignee,
          userIds['test-lead'],
        ]
      );
      const tcId = r.rows[0].id;
      caseIds.push(tcId);
      for (let s = 0; s < c.steps.length; s++) {
        await query(
          `INSERT INTO test_steps (test_case_id, step_number, action, expected_result)
           VALUES ($1, $2, $3, $4)`,
          [tcId, s + 1, c.steps[s].action, c.steps[s].expected]
        );
      }
    }

    // Map cases to suites
    for (const id of caseIds.slice(0, 2)) {
      await query(`INSERT INTO test_suite_cases (suite_id, test_case_id) VALUES ($1, $2)`, [
        suite1.rows[0].id,
        id,
      ]);
    }
    await query(`INSERT INTO test_suite_cases (suite_id, test_case_id) VALUES ($1, $2)`, [
      suite1.rows[0].id,
      caseIds[6],
    ]);
    for (const id of [caseIds[2], caseIds[3], caseIds[8]]) {
      await query(`INSERT INTO test_suite_cases (suite_id, test_case_id) VALUES ($1, $2)`, [
        suite2.rows[0].id,
        id,
      ]);
    }
    for (const id of [caseIds[0], caseIds[5], caseIds[7], caseIds[9]]) {
      await query(`INSERT INTO test_suite_cases (suite_id, test_case_id) VALUES ($1, $2)`, [
        suite3.rows[0].id,
        id,
      ]);
    }

    // Executions over last 14 days
    const results = ['Pass', 'Pass', 'Pass', 'Fail', 'Blocked', 'Skipped', 'Pass', 'Pass'];
    const now = Date.now();
    for (let d = 13; d >= 0; d--) {
      for (let i = 0; i < caseIds.length; i++) {
        if (Math.random() > 0.65) continue;
        const result = results[Math.floor(Math.random() * results.length)];
        const executedBy = i % 2 === 0 ? userIds.tester : userIds.tester2;
        const execAt = new Date(now - d * 24 * 60 * 60 * 1000 - Math.random() * 8 * 3600000);
        const er = await query(
          `INSERT INTO test_executions
            (test_case_id, project_id, executed_by, result, comments, duration_ms, executed_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
          [
            caseIds[i],
            projectId,
            executedBy,
            result,
            result === 'Fail' ? 'Unexpected error observed during step 2' : 'Executed as planned',
            Math.floor(500 + Math.random() * 5000),
            execAt,
          ]
        );
        if (result === 'Fail' && Math.random() > 0.4) {
          await query(
            `INSERT INTO defects
              (project_id, test_execution_id, test_case_id, title, description, severity, status, reported_by)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
            [
              projectId,
              er.rows[0].id,
              caseIds[i],
              `Defect: ${cases[i].title}`,
              'Auto-created from failed execution during seed.',
              cases[i].priority === 'Critical' ? 'Critical' : 'High',
              'Open',
              executedBy,
            ]
          );
        }
      }
    }

    // A few pending (no recent execution) - leave some cases without today's run
    console.log('Seed completed successfully.');
    console.log('\nDemo credentials:');
    console.log('  Admin:     admin@demo.com / Admin@123');
    console.log('  Test Lead: lead@demo.com / Lead@123');
    console.log('  Tester:    tester@demo.com / Tester@123');
    console.log('  Read-Only: readonly@demo.com / Read@123');
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
