@auth @auth-profile
Feature: User Profile Management
  As an authenticated Bookee user
  I want to manage my profile
  So that I can keep my information up to date

  Background:
    Given I navigate to the landing page
    And I open the register form
    And I submit a fresh registration

  @priority_high
  Scenario: Authenticated user can rename their profile
    When I rename my profile to "Jane Doe"
    Then the profile name "Jane Doe" should be visible

  @priority_high
  Scenario: Authenticated user can sign out via profile panel
    When I click profile sign out
    Then I should see the auth form
