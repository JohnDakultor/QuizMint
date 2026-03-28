/// <reference types="cypress" />

describe("Lesson plan generation smoke", () => {
  it("submits the lesson plan form and renders the output panel", () => {
    cy.login();

    cy.intercept("POST", "/api/generate-lesson-plan", {
      statusCode: 200,
      body: {
        lessonPlan: {
          framework: "4a",
          title: "Water Cycle Lesson Plan",
          grade: "Grade 7",
          duration: "2 days",
          objectives: ["Explain evaporation and condensation."],
          days: [],
        },
        usage: null,
        sources: [],
        sourceTrace: null,
      },
    }).as("generateLessonPlan");

    cy.visit("/lessonPlan");
    cy.get("#lessonplan-topic").type("Water Cycle");
    cy.get("#lessonplan-subject").type("Science");
    cy.get("#lessonplan-grade").type("Grade 7");
    cy.get("#lessonplan-generate").click();

    cy.wait("@generateLessonPlan");
    cy.contains("Water Cycle Lesson Plan").should("be.visible");
    cy.contains("Edit PPTX Before Download").should("be.visible");
  });
});
