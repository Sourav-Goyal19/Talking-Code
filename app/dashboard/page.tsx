import ProjectsList from "./components/projects-list";
import NewProjectForm from "./components/project-form";

const Dashboard = () => {
  return (
    <div className="grid grid-cols-1 gap-10 p-4 md:grid-cols-2 md:space-x-4">
      <NewProjectForm />
      <ProjectsList />
    </div>
  );
};

export default Dashboard;
