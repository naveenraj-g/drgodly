export const dynamic = "force-dynamic";

function PatientLayout(props: LayoutProps<"/[locale]/telemedicine/patient">) {
  return <>{props.children}</>;
}

export default PatientLayout;
