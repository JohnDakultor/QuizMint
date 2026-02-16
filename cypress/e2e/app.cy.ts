/// <reference types="cypress" />

describe("Authenticated Home Page", () => {

  beforeEach(() => {
    cy.login();
    cy.visit("/home");
  });

  it("renders input and output cards", () => {
    cy.contains("Create Quiz Input").should("be.visible");
    cy.contains("Generated Quiz").should("be.visible");
  });

  it("generates quiz from text", () => {
    cy.get("textarea").type(
      "Photosynthesis converts sunlight into chemical energy."
    );

    cy.contains("Generate Quiz").click();
    cy.contains("Answer", { timeout: 8000 }).should("be.visible");
  });

  it("copies quiz to clipboard", () => {
    cy.get("textarea").type("Copy test");
    cy.contains("Generate Quiz").click();
    cy.contains("Copy").click();

    cy.window()
      .its("navigator.clipboard")
      .invoke("readText")
      .should("contain", "Answer");
  });

  it("blocks premium downloads for free users", () => {
    cy.get("textarea").type("Premium test");
    cy.contains("Generate Quiz").click();

    cy.contains("Word").click();
    cy.contains("Subscription Required").should("be.visible");
  });

});
