import ProjectsList from "./components/projects-list";
import NewProjectForm from "./components/project-form";

const Dashboard = () => {
  return (
    <div className="flex flex-col md:flex-row p-4 gap-10 space-y-4 md:space-y-0 md:space-x-4">
      <NewProjectForm />
      <ProjectsList />
    </div>
  );
};

export default Dashboard;
