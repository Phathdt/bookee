@operator-shell
Feature: Operator CMS - Application Shell
  As an operator admin
  I want the shell navigation and account controls to work reliably
  So that I can move between modules and sign out safely

  Background:
    Given I am logged in as operator admin

  @priority_high
  Scenario: Admin can sign out via the topbar account menu
    When I open the topbar account menu and sign out
    Then I should be redirected to the operator login page

  @priority_medium
  Scenario: Trips nav link shows active state when on the trips page
    When I navigate to the trips module
    Then the trips nav link should appear active
