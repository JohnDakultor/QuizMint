/// <reference types="cypress" />

describe("Dashboard recent quiz controls smoke", () => {
  it("renders recent quiz actions and can call the close endpoint", () => {
    cy.login();

    cy.intercept("GET", "/api/dashboard/summary", {
      statusCode: 200,
      body: {
        subscriptionPlan: "free",
        quizUsage: 1,
        lastQuizAt: new Date().toISOString(),
        adResetRemaining: 0,
        lastActivityAt: new Date().toISOString(),
        quizCount: 3,
        lessonPlanCount: 2,
        todayQuizCount: 1,
        todayLessonPlanCount: 0,
        recentQuizzes: [
          {
            id: 77,
            title: "Sample Shared Quiz",
            createdAt: new Date().toISOString(),
            shareUrl: "http://localhost:3000/quiz/mock-shared-token",
            shareSettings: {
              isOpen: true,
              expiresAt: new Date(Date.now() + 3600000).toISOString(),
            },
          },
        ],
        recentPlans: [],
      },
    }).as("dashboardSummary");

    cy.intercept("GET", "/api/quiz-share/attempts", {
      statusCode: 200,
      body: {
        attempts: [],
      },
    }).as("quizAttempts");

    cy.intercept("PATCH", "/api/quiz-share", {
      statusCode: 200,
      body: {
        ok: true,
        shareSettings: {
          isOpen: false,
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
        },
      },
    }).as("toggleQuizOpen");

    cy.visit("/home");
    cy.wait("@dashboardSummary");
    cy.wait("@quizAttempts");

    cy.contains("Recent Quizzes").should("be.visible");
    cy.contains("Sample Shared Quiz").click();
    cy.contains("Copy Share Link").should("be.visible");
    cy.contains("Open Student Link").should("be.visible");
    cy.contains("Close Quiz").click();
    cy.wait("@toggleQuizOpen");
  });
});
