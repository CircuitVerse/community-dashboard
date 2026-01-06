// Team data from CircuitVerse /about page

export interface TeamMember {
  username: string;
  name: string;
  avatar_url: string;
  github_url: string;
  role: string;
  team_type: 'core' | 'alumni';
}

// Core team data from CircuitVerse about page
export const coreTeamMembers: TeamMember[] = [
  { username: "tachyons", name: "Aboobacker MK", avatar_url: "https://avatars.githubusercontent.com/u/3112976?s=96&v=4", github_url: "https://github.com/tachyons", role: "Core Team", team_type: "core" },
  { username: "gr455", name: "Ruturaj Mohite", avatar_url: "https://avatars.githubusercontent.com/u/53974118?v=4", github_url: "https://github.com/gr455", role: "Core Team", team_type: "core" },
  { username: "nitin10s", name: "Nitin Singhal", avatar_url: "https://avatars.githubusercontent.com/u/16988558?s=96&v=4", github_url: "https://github.com/nitin10s", role: "Core Team", team_type: "core" },
  { username: "satu0king", name: "Satvik Ramaprasad", avatar_url: "https://avatars.githubusercontent.com/u/2092958?s=96&v=4", github_url: "https://github.com/satu0king", role: "Core Team", team_type: "core" },
  { username: "vedant-jain03", name: "Vedant Jain", avatar_url: "https://avatars.githubusercontent.com/u/76901313?v=4", github_url: "https://github.com/vedant-jain03", role: "Core Team", team_type: "core" },
  { username: "pulkit-30", name: "Pulkit Gupta", avatar_url: "https://avatars.githubusercontent.com/u/76155456?v=4", github_url: "https://github.com/pulkit-30", role: "Core Team", team_type: "core" },
  { username: "VaibhavUpreti", name: "Vaibhav Upreti", avatar_url: "https://avatars.githubusercontent.com/u/85568177?v=4", github_url: "https://github.com/VaibhavUpreti", role: "Core Team", team_type: "core" },
  { username: "Arnabdaz", name: "Arnabdaz", avatar_url: "https://avatars.githubusercontent.com/u/96580571?v=4", github_url: "https://github.com/Arnabdaz", role: "Core Team", team_type: "core" },
  { username: "salmoneatenbybear", name: "Aditya Umesh Singh", avatar_url: "https://avatars.githubusercontent.com/u/177742943?v=4", github_url: "https://github.com/salmoneatenbybear", role: "Core Team", team_type: "core" },
  { username: "ThatDeparted2061", name: "Harsh Rao", avatar_url: "https://avatars.githubusercontent.com/u/166894150?v=4", github_url: "https://github.com/ThatDeparted2061", role: "Core Team", team_type: "core" },
  { username: "nihal4777", name: "Nihal Rajpal", avatar_url: "https://avatars.githubusercontent.com/u/65150640?v=4", github_url: "https://github.com/nihal4777", role: "Core Team", team_type: "core" },
  { username: "JatsuAkaYashvant", name: "Yashvant Singh", avatar_url: "https://avatars.githubusercontent.com/u/146776812?v=4", github_url: "https://github.com/JatsuAkaYashvant", role: "Core Team", team_type: "core" },
  { username: "senbo1", name: "Harsh Bhadu", avatar_url: "https://avatars.githubusercontent.com/u/102225113?v=4", github_url: "https://github.com/senbo1", role: "Core Team", team_type: "core" },
  { username: "Asrani-Aman", name: "Aman Asrani", avatar_url: "https://avatars.githubusercontent.com/u/96644946?v=4", github_url: "https://github.com/Asrani-Aman", role: "Core Team", team_type: "core" },
  { username: "hardik17771", name: "Hardik Sachdeva", avatar_url: "https://avatars.githubusercontent.com/u/85028179?v=4", github_url: "https://github.com/hardik17771", role: "Core Team", team_type: "core" }
];

// Alumni data from CircuitVerse about page
export const alumniMembers: TeamMember[] = [
  { username: "aayush-05", name: "Aayush Gupta", avatar_url: "https://avatars.githubusercontent.com/u/47032027?v=4", github_url: "https://github.com/aayush-05", role: "Alumni", team_type: "alumni" },
  { username: "ShreyaPrasad1209", name: "Shreya Prasad", avatar_url: "https://avatars.githubusercontent.com/u/43600306?s=96&v=4", github_url: "https://github.com/ShreyaPrasad1209", role: "Alumni", team_type: "alumni" },
  { username: "shubhankarsharma00", name: "Shubhankar Sharma", avatar_url: "https://avatars.githubusercontent.com/u/32474302?s=96&v=4", github_url: "https://github.com/shubhankarsharma00", role: "Alumni", team_type: "alumni" },
  { username: "manjotsidhu", name: "Manjot Sidhu", avatar_url: "https://avatars.githubusercontent.com/u/22657113?s=96&v=4", github_url: "https://github.com/manjotsidhu", role: "Alumni", team_type: "alumni" },
  { username: "abstrekt", name: "Samiran Konwar", avatar_url: "https://avatars.githubusercontent.com/u/42478217?v=4", github_url: "https://github.com/abstrekt", role: "Alumni", team_type: "alumni" },
  { username: "ayan-biswas0412", name: "AYAN BISWAS", avatar_url: "https://avatars.githubusercontent.com/u/52851184?s=96&v=4", github_url: "https://github.com/ayan-biswas0412", role: "Alumni", team_type: "alumni" },
  { username: "Nitish145", name: "Nitish Aggarwal", avatar_url: "https://avatars.githubusercontent.com/u/45434030?s=96&v=4", github_url: "https://github.com/Nitish145", role: "Alumni", team_type: "alumni" },
  { username: "pavanjoshi914", name: "Pavan Joshi", avatar_url: "https://avatars.githubusercontent.com/u/55848322?s=96&v=4", github_url: "https://github.com/pavanjoshi914", role: "Alumni", team_type: "alumni" },
  { username: "biswesh456", name: "Biswesh Mohapatra", avatar_url: "https://avatars.githubusercontent.com/u/24248795?v=4", github_url: "https://github.com/biswesh456", role: "Alumni", team_type: "alumni" },
  { username: "Shivansh2407", name: "Shivansh Srivastava", avatar_url: "https://avatars.githubusercontent.com/u/42182955?s=96&v=4", github_url: "https://github.com/Shivansh2407", role: "Alumni", team_type: "alumni" },
  { username: "ZadeAbhishek", name: "Abhishek Zade", avatar_url: "https://avatars.githubusercontent.com/u/66520848?s=96&v=4", github_url: "https://github.com/ZadeAbhishek", role: "Alumni", team_type: "alumni" },
  { username: "devartstar", name: "Devjit Choudhury", avatar_url: "https://avatars.githubusercontent.com/u/61665451?v=4", github_url: "https://github.com/devartstar", role: "Alumni", team_type: "alumni" },
  { username: "aman-singh7", name: "Aman Singh", avatar_url: "https://avatars.githubusercontent.com/u/77198905?v=4", github_url: "https://github.com/aman-singh7", role: "Alumni", team_type: "alumni" },
  { username: "Prerna-0202", name: "Prerna Sharma", avatar_url: "https://avatars.githubusercontent.com/u/89515816?v=4", github_url: "https://github.com/Prerna-0202", role: "Alumni", team_type: "alumni" },
  { username: "tanmoysrt", name: "Tanmoy Sarkar", avatar_url: "https://avatars.githubusercontent.com/u/57363826?v=4", github_url: "https://github.com/tanmoysrt", role: "Alumni", team_type: "alumni" }
];