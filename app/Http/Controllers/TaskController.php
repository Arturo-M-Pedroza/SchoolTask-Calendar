<?php

namespace App\Http\Controllers;

use App\Models\Task;
use Carbon\Carbon;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class TaskController extends Controller
{
    public function getTasks() {
        return response()->json(Auth::user()->tasks);
    }

    public function changeStatus(Request $request) {
        $title = $request->input('title');
        $course = $request->input('course');
        $status = $request->input('status');
        $taskDate = $request->input('date');
        $task = Task::where('title', $title)
                ->where('user_id', Auth::id())
                ->where('course', $course)
                ->first();

        $now = Carbon::now()->subHour('5');
        $dueDate = Carbon::parse($taskDate)->format('Y-m-d');
        $newStatus = $status;

        switch ($status) {
            case 'atrasado':
            case 'pendiente':
                $newStatus = 'hecho';
                break;

            case 'hecho':
                if ($now->lessThan($dueDate)) {
                    $newStatus = 'pendiente'; 
                } else {
                    $newStatus = 'atrasado'; 
                }
                break;
        }

        $task->status = $newStatus;
        $task->save();

        return response()->json([
            'newStatus' => $newStatus
        ], 200);
    }

    public function store(Request $request){
        Log::info('Task store called', $request->all());

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'due_date' => 'required|date',
    ]);

    $task = Task::create([
        'title' => $validated['title'],
        'description' => $validated['description'] ?? null,
        'due_date' => $validated['due_date'],
        'priority' => 2,//medium by default
        'status' => 1,//pending by default
        'source_type' => 2,//personal
        'user_id' => Auth::id(),
        'platform_id' => null, // nullable para tareas personales
    ]);

        return response()->json(['message' =>
             'Tarea creada correctamente', 'task' => $task], 201);
    }

    //to get the color from the platform table
    public function index(){
    $tasks = Task::where('user_id', Auth::id())
        ->with('platform') // get platform data
        ->get();

    return response()->json($tasks);
    }
}
