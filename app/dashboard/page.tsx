import ProjectsList from "./components/projects-list";
import NewProjectForm from "./components/project-form";

const Dashboard = () => {
  return (
    <div>
      <NewProjectForm />
      <ProjectsList />
    </div>
  );
};

export default Dashboard;
