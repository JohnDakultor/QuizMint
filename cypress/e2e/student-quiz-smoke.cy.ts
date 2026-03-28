/// <reference types="cypress" />

describe("Student shared quiz smoke", () => {
  it("renders a shared quiz and starts the fullscreen flow", () => {
    cy.intercept("GET", "/api/quiz-share/*", {
      statusCode: 200,
      body: {
        quiz: {
          id: 101,
          title: "Mock Shared Quiz",
          instructions: "Answer each question carefully.",
          difficulty: "easy",
          questions: [
            {
              id: 1,
              question:
                "Game Challenge [TIMELINE_ORDER]: Arrange these steps: [Collect data], [Process data], [Repackage data]",
              options: [],
              questionType: "gamified",
              structure: {
                type: "gamified",
                mode: "timeline",
                timelineItems: ["Collect data", "Process data", "Repackage data"],
              },
            },
          ],
        },
      },
    }).as("getSharedQuiz");

    cy.visit("/quiz/mock-shared-token", {
      onBeforeLoad(win) {
        Object.defineProperty(win.document.documentElement, "requestFullscreen", {
          configurable: true,
          value: () => Promise.resolve(),
        });
      },
    });

    cy.wait("@getSharedQuiz");
    cy.contains("Mock Shared Quiz").should("be.visible");
    cy.contains("Start Quiz").click();
    cy.contains("Name").should("be.visible");
    cy.contains("Email").should("be.visible");
    cy.contains("Timeline Order").should("be.visible");
    cy.contains("Collect data").should("be.visible");
  });
});
