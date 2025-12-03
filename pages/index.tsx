import SimpleForm from "../components/SimpleForm";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold mb-6">Brew Thermal Tool</h1>
      <SimpleForm />
    </main>
  );
}
