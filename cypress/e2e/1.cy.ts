/// <reference types="cypress" />

describe("Quiz Forge smoke flows", () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  it("shows the sign-in validation before terms are accepted", () => {
    cy.visit("/sign-in");
    cy.get("#email").type(Cypress.env("TEST_EMAIL"));
    cy.get("#password").type(Cypress.env("TEST_PASSWORD"), { log: false });
    cy.contains('button[type="submit"]', "Sign In").click();
    cy.contains("You must accept the Terms of Service").should("be.visible");
  });

  it("logs in and opens the home workspace", () => {
    cy.login();
    cy.visit("/home");
    cy.contains("Create Quiz Input").should("be.visible");
    cy.contains("Generated Quiz").should("be.visible");
  });

  it("shows the free-plan gate for file upload", () => {
    cy.login();
    cy.visit("/generate-quiz");

    cy.fixture("sample.txt").then((fileContent) => {
      cy.get("#quiz-upload-input").attachFile({
        fileContent: fileContent.toString(),
        fileName: "sample.txt",
        mimeType: "text/plain",
      }, { force: true });
    });

    cy.contains("Subscription Required").should("be.visible");
  });
});
