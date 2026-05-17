@operator-routes
Feature: Operator CMS - Routes CRUD
  As an operator admin
  I want to manage routes between stations
  So that I can schedule trips

  Background:
    Given I am logged in as operator admin

  @priority_high
  Scenario: Admin can navigate to the routes page
    When I navigate to the routes module
    Then I should see the routes page heading

  @priority_high
  Scenario: Admin can create a new route
    When I navigate to the routes module
    And I create a new route with seeded stations
    Then the new route should appear in the routes table

  @priority_high
  Scenario: Admin can delete a route
    When I navigate to the routes module
    And I create a new route with seeded stations
    Then the new route should appear in the routes table
    When I delete the new route
    Then the new route should not appear in the routes table
