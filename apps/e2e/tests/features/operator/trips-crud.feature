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

  @priority_medium
  Scenario: Status filter narrows table to scheduled trips only
    When I navigate to the trips module
    And I filter trips by status "scheduled"
    Then only trips with status "scheduled" should be visible

  @priority_medium
  Scenario: Admin can bulk create trips for a date range
    When I navigate to the trips module
    And I bulk create trips for route 1 over 2 days
    Then at least one trip row should be visible with status "scheduled"

  @priority_medium
  Scenario: Admin can view a trip in readonly mode
    When I navigate to the trips module
    And I create a new trip with a seeded route and vehicle
    Then the new trip should appear with status "scheduled"
    When I open the view dialog for the new trip
    Then the trip form fields should be disabled

  @priority_medium
  Scenario: Admin can transition a trip from scheduled to in_progress
    When I navigate to the trips module
    And I create a new trip with a seeded route and vehicle
    Then the new trip should appear with status "scheduled"
    When I transition the new trip to "in_progress"
    Then the new trip should show status "in_progress"
