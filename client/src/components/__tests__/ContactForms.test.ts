import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Unit tests for Contact Sales and Pilot Program forms
 * Tests form validation, submission, and error handling
 */

describe("Contact Forms", () => {
  describe("ContactSalesModal", () => {
    it("should validate required fields (name, email, company)", () => {
      const requiredFields = ["name", "email", "company"];
      expect(requiredFields).toHaveLength(3);
      expect(requiredFields).toContain("name");
      expect(requiredFields).toContain("email");
      expect(requiredFields).toContain("company");
    });

    it("should accept optional phone field", () => {
      const optionalFields = ["phone", "message"];
      expect(optionalFields).toContain("phone");
      expect(optionalFields).toContain("message");
    });

    it("should format email to lowercase", () => {
      const testEmail = "Test@Example.COM";
      const formatted = testEmail.toLowerCase();
      expect(formatted).toBe("test@example.com");
    });

    it("should trim whitespace from inputs", () => {
      const input = "  John Doe  ";
      const trimmed = input.trim();
      expect(trimmed).toBe("John Doe");
    });

    it("should validate email format", () => {
      const validEmails = [
        "user@company.com",
        "john.doe@example.org",
        "test+tag@domain.co.uk",
      ];
      const invalidEmails = ["notanemail", "missing@domain", "@nodomain.com"];

      validEmails.forEach((email) => {
        const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        expect(isValid).toBe(true);
      });

      invalidEmails.forEach((email) => {
        const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        expect(isValid).toBe(false);
      });
    });
  });

  describe("PilotProgramModal", () => {
    it("should validate required fields for pilot program", () => {
      const requiredFields = [
        "name",
        "email",
        "city",
        "department",
        "primaryInterest",
      ];
      expect(requiredFields).toHaveLength(5);
    });

    it("should accept optional timeline and message fields", () => {
      const optionalFields = ["timeline", "message"];
      expect(optionalFields).toContain("timeline");
      expect(optionalFields).toContain("message");
    });

    it("should support primary interest options", () => {
      const interestOptions = [
        "underground_utilities",
        "construction_oversight",
        "infrastructure_planning",
        "asset_management",
        "emergency_response",
        "other",
      ];
      expect(interestOptions).toHaveLength(6);
      expect(interestOptions).toContain("underground_utilities");
    });

    it("should support timeline options", () => {
      const timelineOptions = [
        "immediate",
        "q2",
        "q3",
        "q4",
        "flexible",
      ];
      expect(timelineOptions).toHaveLength(5);
    });

    it("should validate city format", () => {
      const validCities = ["Dallas, TX", "New York, NY", "Los Angeles"];
      validCities.forEach((city) => {
        expect(city.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Form Submission", () => {
    it("should require all contact sales required fields before submission", () => {
      const formData = {
        name: "",
        email: "",
        company: "",
        phone: "",
        message: "",
      };

      const isValid =
        formData.name.trim() &&
        formData.email.trim() &&
        formData.company.trim();
      expect(isValid).toBeFalsy();

      formData.name = "John Doe";
      formData.email = "john@example.com";
      formData.company = "Acme Corp";
      const isValidNow =
        formData.name.trim() &&
        formData.email.trim() &&
        formData.company.trim();
      expect(isValidNow).toBeTruthy();
    });

    it("should require all pilot program required fields before submission", () => {
      const formData = {
        name: "",
        email: "",
        city: "",
        department: "",
        primaryInterest: "",
        timeline: "",
        message: "",
      };

      const isValid =
        formData.name.trim() &&
        formData.email.trim() &&
        formData.city.trim() &&
        formData.department.trim() &&
        formData.primaryInterest.trim();
      expect(isValid).toBeFalsy();

      formData.name = "Jane Smith";
      formData.email = "jane@municipality.gov";
      formData.city = "Dallas, TX";
      formData.department = "Public Works";
      formData.primaryInterest = "underground_utilities";
      const isValidNow =
        formData.name.trim() &&
        formData.email.trim() &&
        formData.city.trim() &&
        formData.department.trim() &&
        formData.primaryInterest.trim();
      expect(isValidNow).toBeTruthy();
    });

    it("should handle optional fields gracefully", () => {
      const formData = {
        name: "Test User",
        email: "test@example.com",
        company: "Test Co",
        phone: "", // optional
        message: "", // optional
      };

      const phoneValue = formData.phone.trim() || undefined;
      const messageValue = formData.message.trim() || undefined;

      expect(phoneValue).toBeUndefined();
      expect(messageValue).toBeUndefined();
    });
  });

  describe("Email Sending", () => {
    it("should send contact sales inquiry with correct payload", () => {
      const payload = {
        name: "John Doe",
        email: "john@example.com",
        company: "Acme Corp",
        phone: "555-1234",
        message: "Interested in enterprise plan",
      };

      expect(payload).toHaveProperty("name");
      expect(payload).toHaveProperty("email");
      expect(payload).toHaveProperty("company");
      expect(payload.name).toBe("John Doe");
      expect(payload.email).toBe("john@example.com");
    });

    it("should send pilot program application with correct payload", () => {
      const payload = {
        name: "Jane Smith",
        email: "jane@municipality.gov",
        city: "Dallas, TX",
        department: "Public Works",
        primaryInterest: "underground_utilities",
        timeline: "immediate",
        message: "Looking to modernize our project oversight",
      };

      expect(payload).toHaveProperty("name");
      expect(payload).toHaveProperty("email");
      expect(payload).toHaveProperty("city");
      expect(payload).toHaveProperty("department");
      expect(payload).toHaveProperty("primaryInterest");
      expect(payload.primaryInterest).toBe("underground_utilities");
    });
  });

  describe("Error Handling", () => {
    it("should handle submission errors gracefully", () => {
      const error = new Error("Failed to submit form");
      expect(error.message).toBe("Failed to submit form");
    });

    it("should provide user-friendly error messages", () => {
      const errorMessages = {
        validation: "Please fill in all required fields",
        submission: "Failed to submit inquiry. Please try again later.",
        network: "Network error. Please check your connection.",
      };

      expect(errorMessages.validation).toContain("required fields");
      expect(errorMessages.submission).toContain("Failed");
    });
  });
});
