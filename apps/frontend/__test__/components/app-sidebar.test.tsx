import { render, screen } from "@testing-library/react";
import { usePathname, useSearchParams } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";

jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
  useSearchParams: jest.fn(),
}));

const spaces = [
  { id: "citizen-space", name: "市民課", currentUserRole: "admin" as const },
  { id: "road-space", name: "道路公園課", currentUserRole: "admin" as const },
];

describe("AppSidebar", () => {
  beforeEach(() => {
    jest
      .mocked(useSearchParams)
      .mockReturnValue(new URLSearchParams() as ReturnType<typeof useSearchParams>);
  });

  it("links current-space items to the selected workspace from tenant admin pages", () => {
    jest.mocked(usePathname).mockReturnValue("/admin/spaces");

    render(
      <AppSidebar userEmail="admin@example.com" userRoles={["tenant_admin"]} spaces={spaces}>
        <div>content</div>
      </AppSidebar>,
    );

    expect(screen.getByRole("link", { name: "市民課" })).toHaveAttribute(
      "href",
      "/space/citizen-space/submissions",
    );
    expect(screen.getByRole("link", { name: "道路公園課" })).toHaveAttribute(
      "href",
      "/space/road-space/submissions",
    );
  });

  it("preserves the current workspace section when switching between space-scoped pages", () => {
    jest.mocked(usePathname).mockReturnValue("/space/citizen-space/applications");

    render(
      <AppSidebar userEmail="admin@example.com" userRoles={["tenant_admin"]} spaces={spaces}>
        <div>content</div>
      </AppSidebar>,
    );

    expect(screen.getByRole("link", { name: "道路公園課" })).toHaveAttribute(
      "href",
      "/space/road-space/applications",
    );
  });
});
