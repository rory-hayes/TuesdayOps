const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export type SampleDataIds = {
  clientId: string;
  workflowId: string;
  checkId: string;
  healthyRunId: string;
  failedRunId: string;
  issueId: string;
  testPackId: string;
  testCaseId: string;
  testRunId: string;
  reportId: string;
  reportItemIds: [string, string, string] | string[];
};

export type SampleDataSeedInput = {
  agencyId: string;
  now: Date;
  ids: SampleDataIds;
};

export function buildSampleDataSeed({ agencyId, now, ids }: SampleDataSeedInput) {
  const createdAt = now.toISOString();
  const healthyRunAt = new Date(now.getTime() - 1000 * 60 * 42).toISOString();
  const failedRunAt = new Date(now.getTime() - 1000 * 60 * 18).toISOString();
  const period = formatPeriod(now);
  const periodStart = formatDateOnly(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)));
  const periodEnd = formatDateOnly(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)));
  const periodLabel = `${MONTH_NAMES[now.getUTCMonth()]} ${now.getUTCFullYear()}`;

  return {
    client: {
      id: ids.clientId,
      agency_id: agencyId,
      name: "Acme AI Support",
      slug: "acme-ai-support-demo",
      industry: "Professional services",
      report_recipient_email: "ops@example.invalid",
      notes: "Demo client seeded for TuesdayOps sales and onboarding walkthroughs.",
      created_at: createdAt,
      updated_at: createdAt,
    },
    workflow: {
      id: ids.workflowId,
      agency_id: agencyId,
      client_id: ids.clientId,
      name: "Lead Intake Assistant",
      type: "http_endpoint",
      environment: "production",
      endpoint_url: "https://httpbin.org/status/200",
      method: "GET",
      auth_type: "none",
      encrypted_auth_config: null,
      check_frequency_minutes: 60,
      status: "degraded",
      pass_rate: 50,
      latency_ms: 1280,
      monthly_cost: 42,
      last_check_at: failedRunAt,
      included_in_reports: true,
      created_at: createdAt,
      updated_at: createdAt,
    },
    check: {
      id: ids.checkId,
      agency_id: agencyId,
      workflow_id: ids.workflowId,
      name: "Endpoint health check",
      type: "health",
      config_json: {
        timeoutMs: 5000,
        assertions: [
          { type: "status_code", expected: 200 },
          { type: "latency_under", maxMs: 2000 },
        ],
      },
      enabled: true,
      schedule: "Every 60 minutes",
      created_at: createdAt,
      updated_at: createdAt,
    },
    checkRuns: [
      {
        id: ids.healthyRunId,
        agency_id: agencyId,
        client_id: ids.clientId,
        workflow_id: ids.workflowId,
        check_id: ids.checkId,
        status: "healthy",
        status_code: 200,
        latency_ms: 860,
        response_summary: "Endpoint responded with the expected status code.",
        assertion_results_json: [
          { type: "status_code", passed: true, expected: 200, actual: 200 },
          { type: "latency_under", passed: true, maxMs: 2000, actual: 860 },
        ],
        started_at: healthyRunAt,
        completed_at: healthyRunAt,
        created_at: healthyRunAt,
      },
      {
        id: ids.failedRunId,
        agency_id: agencyId,
        client_id: ids.clientId,
        workflow_id: ids.workflowId,
        check_id: ids.checkId,
        status: "failed",
        status_code: 500,
        latency_ms: 2310,
        response_summary: "Endpoint returned a server error during the demo check.",
        assertion_results_json: [
          { type: "status_code", passed: false, expected: 200, actual: 500 },
          { type: "latency_under", passed: false, maxMs: 2000, actual: 2310 },
        ],
        error_message: "Demo failure: downstream scoring service returned 500.",
        started_at: failedRunAt,
        completed_at: failedRunAt,
        created_at: failedRunAt,
      },
    ],
    issue: {
      id: ids.issueId,
      agency_id: agencyId,
      client_id: ids.clientId,
      workflow_id: ids.workflowId,
      check_run_id: ids.failedRunId,
      fingerprint: "demo-lead-intake-assistant-500",
      severity: "high",
      status: "open",
      title: "Lead intake assistant returned 500 errors",
      description: "The demo workflow failed its endpoint health check and needs maintenance review.",
      suggested_action: "Inspect the downstream scoring API credentials and rerun the endpoint health check.",
      reportable: true,
      last_seen_at: failedRunAt,
      occurrence_count: 1,
      created_at: failedRunAt,
      updated_at: failedRunAt,
    },
    testPack: {
      id: ids.testPackId,
      agency_id: agencyId,
      workflow_id: ids.workflowId,
      name: "Lead intake regression pack",
      description: "Demo synthetic test pack for required response guardrails.",
      enabled: true,
      created_at: createdAt,
      updated_at: createdAt,
    },
    testCase: {
      id: ids.testCaseId,
      agency_id: agencyId,
      workflow_id: ids.workflowId,
      test_pack_id: ids.testPackId,
      name: "Valid lead payload returns a result",
      input_json: { leadId: "demo-lead-001", email: "lead@example.invalid" },
      expected_json: { status: "accepted" },
      assertions_json: [
        { type: "status_code", expected: 200 },
        { type: "latency_under", maxMs: 2000 },
        { type: "not_contains", value: "fatal" },
      ],
      created_at: createdAt,
      updated_at: createdAt,
    },
    testRun: {
      id: ids.testRunId,
      agency_id: agencyId,
      workflow_id: ids.workflowId,
      test_pack_id: ids.testPackId,
      test_case_id: ids.testCaseId,
      status: "failed",
      status_code: 500,
      latency_ms: 2310,
      response_summary: "Demo synthetic check caught the same endpoint failure.",
      assertion_results_json: [
        { type: "status_code", passed: false, expected: 200, actual: 500 },
        { type: "latency_under", passed: false, maxMs: 2000, actual: 2310 },
      ],
      error_message: "Demo failure: endpoint returned 500.",
      created_at: failedRunAt,
    },
    report: {
      id: ids.reportId,
      agency_id: agencyId,
      client_id: ids.clientId,
      period_start: periodStart,
      period_end: periodEnd,
      period,
      period_label: periodLabel,
      status: "ready_to_send",
      summary:
        "Acme AI Support had one monitored workflow, two check runs, and one high-priority maintenance issue caught during the demo period.",
      metrics_json: {
        workflowsMonitored: 1,
        checksRun: 2,
        issuesCaught: 1,
        issuesResolved: 0,
        testRuns: 1,
        testFailures: 1,
        passRate: 50,
      },
      recommendations_json: [
        "Rerun the endpoint check after the downstream scoring API is restored.",
        "Keep the regression pack enabled before client reporting.",
      ],
      generated_at: createdAt,
      created_at: createdAt,
      updated_at: createdAt,
    },
    reportItems: [
      {
        id: ids.reportItemIds[0],
        agency_id: agencyId,
        report_id: ids.reportId,
        category: "workflow_health",
        title: "Workflow monitored",
        body: "Lead Intake Assistant is included in monthly proof reporting and has current check history.",
        sort_order: 1,
      },
      {
        id: ids.reportItemIds[1],
        agency_id: agencyId,
        report_id: ids.reportId,
        category: "issues_caught",
        title: "Issue caught",
        body: "TuesdayOps caught a demo 500 error before the monthly client report was prepared.",
        sort_order: 2,
      },
      {
        id: ids.reportItemIds[2],
        agency_id: agencyId,
        report_id: ids.reportId,
        category: "qa_checks",
        title: "Synthetic QA result",
        body: "The demo regression pack shows how failed synthetic tests become reportable maintenance work.",
        sort_order: 3,
      },
    ],
  };
}

function formatPeriod(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}
