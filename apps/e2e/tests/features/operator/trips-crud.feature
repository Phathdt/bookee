@operator-trips
Feature: Operator CMS - Trips CRUD
  As an operator admin
  I want to manage trips
  So that customers can book seats

  Background:
    Given I am logged in as operator admin

  @priority_high
  Scenario: Admin can navigate to the trips page
    When I navigate to the trips module
    Then I should see the trips page heading
    And the bulk create button should be visible

  @priority_high
  Scenario: Admin can create a single trip
    When I navigate to the trips module
    And I create a new trip with a seeded route and vehicle
    Then the new trip should appear with status "scheduled"

  @priority_high
  Scenario: Admin can cancel a scheduled trip
    When I navigate to the trips module
    And I create a new trip with a seeded route and vehicle
    Then the new trip should appear with status "scheduled"
    When I cancel the new trip
    Then the new trip should show status "cancelled"
