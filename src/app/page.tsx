import { Header } from '@/components/header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Home as HomeIcon, BarChart2, Briefcase, User } from 'lucide-react';
import HomeTab from '@/components/dashboard/home-tab';
import AnalyzeTab from '@/components/dashboard/analyze-tab';
import DealsTab from '@/components/dashboard/deals-tab';
import ProfileTab from '@/components/dashboard/profile-tab';

export default function Home() {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <Tabs defaultValue="home" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 md:w-fit">
            <TabsTrigger value="home">
              <HomeIcon className="mr-0 sm:mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Home</span>
            </TabsTrigger>
            <TabsTrigger value="analyze">
              <BarChart2 className="mr-0 sm:mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Analyze</span>
            </TabsTrigger>
            <TabsTrigger value="deals">
              <Briefcase className="mr-0 sm:mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Deals</span>
            </TabsTrigger>
            <TabsTrigger value="profile">
              <User className="mr-0 sm:mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="home" className="mt-4">
            <HomeTab />
          </TabsContent>
          <TabsContent value="analyze" className="mt-4">
            <AnalyzeTab />
          </TabsContent>
          <TabsContent value="deals" className="mt-4">
            <DealsTab />
          </TabsContent>
          <TabsContent value="profile" className="mt-4">
            <ProfileTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
