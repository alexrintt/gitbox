import { PageLayout } from "@primer/react";
import { LayoutHeader } from "./header";
import { LayoutFooter } from "./footer";

export function Layout({ children }: React.PropsWithChildren) {
  return (
    <>
      <PageLayout.Header>
        <LayoutHeader />
      </PageLayout.Header>
      <PageLayout>
        <PageLayout.Content>{children}</PageLayout.Content>
      </PageLayout>
      <PageLayout.Footer>
        <LayoutFooter />
      </PageLayout.Footer>
    </>
  );
}
