@operator-seat-layouts
Feature: Operator CMS - Seat Layouts
  As an operator admin
  I want to manage seat layout configurations
  So that I can assign them to vehicles

  Background:
    Given I am logged in as operator admin

  @priority_high
  Scenario: Admin can navigate to the seat layouts page
    When I navigate to the seat layouts module
    Then I should see the seat layouts page heading

  @priority_high
  Scenario: Admin can open the create seat layout dialog
    When I navigate to the seat layouts module
    And I open the add layout dialog
    Then the add seat layout dialog should be visible

  @priority_high
  Scenario: Seeded layout appears in the table
    When I navigate to the seat layouts module
    Then I should see the seeded layout "Giường nằm 34 chỗ" in the table

  @priority_high
  Scenario: Admin can create a seat layout with minimal seats JSON
    When I navigate to the seat layouts module
    And I create a seat layout with name "E2E Layout" rows 2 cols 2 and seats "[]"
    Then I should see the layout "E2E Layout" in the table

  @priority_high
  Scenario: Admin can delete a created seat layout
    When I navigate to the seat layouts module
    And I create a seat layout with name "E2E ToDelete" rows 1 cols 1 and seats "[]"
    Then I should see the layout "E2E ToDelete" in the table
    When I delete the layout "E2E ToDelete"
    Then the layout "E2E ToDelete" should not appear in the table
