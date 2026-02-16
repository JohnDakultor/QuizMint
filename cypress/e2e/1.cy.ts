/// <reference types="cypress" />

describe("QuizMintAI E2E Tests", () => {
  const testUser = {
    username: "Test User",
    email: "v@gmail.com",
    password: "TestPassword123!"
  };

  beforeEach(() => {
    // Reset session/cookies before each test
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  it("Sign Up flow", () => {
    cy.visit("/sign-up");

    cy.get("#name").type(testUser.username);
    cy.get("#email").type(testUser.email);
    cy.get("#password").type(testUser.password);

    // Ensure password is strong enough
    cy.contains("Password strength: Strong").should("exist");

    cy.get('button[type="submit"]').click();

    // After successful signup, should redirect to sign-in
    cy.url().should("include", "/sign-in");
  });

  it("Sign In flow with terms acceptance", () => {
    cy.visit("/sign-in");

    cy.get("#email").type(testUser.email);
    cy.get("#password").type(testUser.password);

    // Try without accepting terms
    cy.get('button[type="submit"]').click();
    cy.contains("You must accept the Terms of Service").should("exist");

    // Accept terms and submit
    cy.get('input[type="checkbox"]').check();
    cy.get('button[type="submit"]').click();

    // Should redirect to /home
    cy.url().should("include", "/home");
    cy.contains("Welcome Back").should("exist");
  });

  it("Generate quiz from pasted text", () => {
   cy.login();
  cy.visit('/home');
    const sampleText = "Photosynthesis is the process by which plants produce food using sunlight.";

    cy.get("textarea").type(sampleText);

    cy.contains("Generate Quiz").click();

    // Wait for the quiz to be generated
    cy.get(".GeneratedQuiz").should("exist"); // add a class to quiz card or use CardContent selector
    cy.contains("Photosynthesis").should("exist");
    cy.contains("Your generated quiz will appear here").should("not.exist");
  });

  it("Uploading file requires premium subscription", () => {
    cy.login(testUser.email, testUser.password);

    cy.visit("/home");

    // Use fixture as file upload
    cy.fixture("sample.txt").then((fileContent) => {
      cy.get('input[type="file"]').attachFile({
        fileContent: fileContent.toString(),
        fileName: "sample.txt",
        mimeType: "text/plain",
      });
    });

    // Should show subscription modal for non-premium users
    cy.contains("Subscription Required").should("exist");
    cy.contains("Uploading files is available only for premium members").should("exist");
  });

  it("Copy and download quiz functionality", () => {
    cy.login(testUser.email, testUser.password);
    cy.visit("/home");
    
    const sampleText = "Water boils at 100°C under standard atmospheric pressure.";
    cy.get("textarea").type(sampleText);
    cy.contains("Generate Quiz").click();
    
    cy.wait(1000); // wait for quiz generation
    
    // Copy quiz to clipboard
    cy.contains("Copy").click();
    
    // Download PDF
    cy.contains("PDF").click();
    
    // Download Word (non-premium should trigger subscription modal)
    cy.contains("Word").click();
    cy.contains("Subscription Required").should("exist");
    
    // Download PPT (non-premium should trigger subscription modal)
    cy.contains("PPT").click();
    cy.contains("Subscription Required").should("exist");
  });
});
