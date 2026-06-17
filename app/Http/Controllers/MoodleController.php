<?php

namespace App\Http\Controllers;

use App\Models\Platform;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use App\Models\Task;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;
use Exception;
use Illuminate\Support\Facades\Auth;

class MoodleController extends Controller
{
    public function fetchAndStoreTasks(Request $request)
    {
        $name = $request->input('name');
        $url = $request->input('url');
        $username = $request->input('username');
        $password = $request->input('password');
        $color = $request->input('color');
        $token = "";


        if(Platform::where('user_id', Auth::id())->where('url', $url)->exists()){
            return response()->json(['message' => 'Esta plataforma ya esta registrada']);
        }

        #Log::info('Color recibido desde React:', ['color' => $color]);
        try {
            if (empty($url) || empty($username) || empty($password)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Todos los campos son obligatorios.'
                ], 400);
            }

            $token = $this->getToken($url, $username, $password);

            if (empty($token)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Credenciales incorrectas o usuario no válido.'
                ], 401);
            }

            $getUserInfo = Http::get($url . '/webservice/rest/server.php', [
                'wstoken' => $token,
                'wsfunction' => 'core_webservice_get_site_info',
                'moodlewsrestformat' => 'json'
            ])->json();

            $getCourses = Http::get($url . '/webservice/rest/server.php', [
                'wstoken' => $token,
                'wsfunction' => 'core_enrol_get_users_courses',
                'userid' => $getUserInfo['userid'],
                'moodlewsrestformat' => 'json'
            ])->json();

            //I moved it I needed to create the platform before creating the tasks to assign the platform_id to the tasks
            $platform = Platform::updateOrCreate([
                'user_id' => Auth::id(),
                'url' => $url,
            ],[
                'token' => $token,
                'name' => $name,
                'type' => 'moodle',
                'default_color' => $color,
            ]
            );          

            $count = 0;
            foreach ($getCourses as $course) {
                $courseName = $course['fullname'];
                $getTasks = Http::get($url . '/webservice/rest/server.php', [
                    'wstoken' => $token,
                    'wsfunction' => 'core_calendar_get_calendar_events',
                    'moodlewsrestformat' => 'json',
                    'events[courseids][0]' => $course['id']
                ])->json();

                if (!isset($getTasks['events'])) continue;

                foreach ($getTasks['events'] as $task) {
                    $taskDate = Carbon::createFromTimestamp($task['timestart'])->subHours(6);
                    $status = $taskDate->isAfter(Carbon::now()) ? 'pendiente' : 'atrasado';

                    Task::updateOrCreate(
                        [
                            'user_id' => Auth::id(),
                            'platform_id' => $platform -> id, // se asignará después de crear o actualizar la plataforma
                            'title' => $task['name'],
                            'course' => $courseName,
                        ],
                        [
                            'due_date' => $taskDate->format('Y-m-d'),
                            'status' => $status,
                            'source_type' => 1,//platform
                            'priority' => 2,//medium
                        ]
                    );

                    $count++;
                }

            }

            return response()->json([
                'success' => true,
                'message' => "Plataforma conectada correctamente. Se encontraron " . count($getCourses) . " cursos.\n
                Tareas sincronizadas correctamente. Se encontraron {$count} tareas."
            ]);

        } catch (Exception $e) {
            Log::error("Error general: " . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error inesperado: ' . $e->getMessage()
            ], 500);
        }
    }

    public function refreshPlatform(Request $request)
    {
        $url = $request->input('url');

        try {
            $platform = \App\Models\Platform::where('url', $url)->where('user_id', Auth::id())->first();

            if (!$platform) {
                return response()->json([
                    'success' => false,
                    'message' => 'Plataforma no encontrada.'
                ], 404);
            }

            if (empty($platform->token)) {
                return response()->json([
                    'success' => false,
                    'message' => 'No se encontró un token valido para esta plataforma.'
                ], 400);
            }

            $getUserInfo = Http::get($url . '/webservice/rest/server.php', [
                'wstoken' => $platform->token,
                'wsfunction' => 'core_webservice_get_site_info',
                'moodlewsrestformat' => 'json'
            ])->json();

            #Log::info('getUserInfo', ['response' => $getUserInfo]);
            
            if (isset($getUserInfo['errorcode']) && $getUserInfo['errorcode'] === 'invalidtoken') {
                // Token invalid. Credentials input 
                $providedUsername = $request->input('username');
                $providedPassword = $request->input('password');
                
                $newToken = null;

                if (!empty($providedUsername) && !empty($providedPassword)) {
                    $newToken = $this->getToken($url, $providedUsername, $providedPassword);
                }

                if (empty($newToken)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Credenciales incorrectas o usuario no válido.',                      'reauth_required' => true
                    ], 401);
                }

                // Save new token and continue.
                $platform->token = $newToken;
                $platform->save();

                $getUserInfo = Http::get($url . '/webservice/rest/server.php', [
                    'wstoken' => $platform->token,
                    'wsfunction' => 'core_webservice_get_site_info',
                    'moodlewsrestformat' => 'json'
                ])->json();
            }

            if (isset($getUserInfo['exception'])) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Credenciales incorrectas o usuario no válido.'
                    ], 401);
                }

            // Obtener cursos del usuario
            $getCourses = Http::get($url . '/webservice/rest/server.php', [
                'wstoken' => $platform->token,
                'wsfunction' => 'core_enrol_get_users_courses',
                'userid' => $getUserInfo['userid'],
                'moodlewsrestformat' => 'json'
            ])->json();

            $count = 0;

            foreach ($getCourses as $course) {
                $courseName = $course['fullname'];
                $getTasks = Http::get($url . '/webservice/rest/server.php', [
                    'wstoken' => $platform->token,
                    'wsfunction' => 'core_calendar_get_calendar_events',
                    'moodlewsrestformat' => 'json',
                    'events[courseids][0]' => $course['id']
                ])->json();

                if (!isset($getTasks['events'])) continue;

                foreach ($getTasks['events'] as $task) {

                    $tsk = Task::where('title', $task['name'])->where('course', $courseName)->first();
                    if ($tsk) continue; // si ya existe la tarea

                    $taskDate = Carbon::createFromTimestamp($task['timestart'])->subHours(6);
                    $status = $taskDate->isAfter(Carbon::now()) ? 'pendiente' : 'atrasado';

                    $taskModel = Task::updateOrCreate(
                        [
                            'user_id'     => Auth::id(),
                            'platform_id' => $platform->id,
                            'title'       => $task['name'],
                            'course'      => $courseName,
                        ],
                        [
                            'due_date'    => $taskDate->format('Y-m-d'),
                            'status'      => $status,
                            'source_type' => 1,
                            'priority'    => 2,
                        ]
                    );

                    if ($taskModel->wasRecentlyCreated) {
                        $count++;
                    }

                }
            }

            return response()->json([
                'success' => true,
                'message' => "Refrescado con exito. Se encontraron {$count} tareas nuevas."
            ]);

        } catch (Exception $e) {
            Log::error("Error refrescando plataforma: " . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error inesperado: ' . $e->getMessage()
            ], 500);
        }
    }
    
    private function getToken($url, $username, $password): ?string
    {
        try {
            $resp = Http::get($url . '/login/token.php', [
                'username' => $username,
                'password' => $password,
                'service' => 'moodle_mobile_app'
            ]);

            if ($resp->failed() || !isset($resp->json()['token'])) {
                return null;
            }

            return (string) $resp->json()['token'] ;
            
        } catch (Exception $e) {
            Log::error("Excepción al obtener token: " . $e->getMessage());
            return null;
        }
    }
}