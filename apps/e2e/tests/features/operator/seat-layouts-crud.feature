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
