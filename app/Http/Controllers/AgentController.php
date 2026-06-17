<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AgentController extends Controller
{
    // n8n llama esto para obtener el token
    public function authenticate(Request $request)
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required',
            'device'   => 'sometimes|string',
        ]);

        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            return response()->json(['error' => 'Credenciales inválidas'], 401);
        }

        // Elimina tokens viejos del agente y crea uno nuevo
        $user->tokens()->where('name', 'n8n-agent')->delete();
        
        $token = $user->createToken('n8n-agent', ['agent:read', 'agent:write']);

        return response()->json([
            'token'      => $token->plainTextToken,
            'expires_at' => now()->addDays(30)->toISOString(),
            'user'       => ['id' => $user->id, 'name' => $user->name],
        ]);
    }

    // ─────────────────────────────────────────
    // GET /api/agent/tasks?date_from=&date_to=
    // ─────────────────────────────────────────
    public function getTasks(Request $request)
    {
        $request->validate([
            'date_from' => 'required|date',
            'date_to'   => 'required|date|after_or_equal:date_from',
            'status'    => 'sometimes|in:pendiente,hecho,atrasado',
        ]);

        $tasks = Task::where('user_id', $request->user()->id)
            ->whereBetween('due_date', [
                $request->date_from,
                $request->date_to,
            ])
            ->when(
                $request->status,
                fn($q) => $q->where('status', $request->status),
                fn($q) => $q->where('status', 'pendiente') // default: solo pendientes
            )
            ->orderBy('due_date')
            ->get(['id', 'title', 'due_date', 'status', 'priority', 'course', 'source_type']);

        return response()->json([
            'count' => $tasks->count(),
            'tasks' => $tasks,
        ]);
    }

    // ─────────────────────────────────────────
    // POST /api/agent/tasks
    // ─────────────────────────────────────────
    public function createTask(Request $request)
    {
        $request->validate([
            'title'       => 'required|string|max:500',
            'due_date'    => 'required|date',
            'priority'    => 'sometimes|in:low,medium,high',
            'description' => 'sometimes|nullable|string',
            'course'      => 'sometimes|nullable|string|max:255',
        ]);

        $task = Task::create([
            'user_id'     => $request->user()->id,
            'title'       => $request->title,
            'due_date'    => $request->due_date,
            'status'      => 'pendiente',
            'source_type' => 'personal',
            'platform_id' => null,
            'priority'    => $request->priority ?? 'medium',
            'description' => $request->description,
            'course'      => $request->course,
        ]);

        return response()->json([
            'message' => 'Tarea creada correctamente',
            'task'    => $task->only(['id', 'title', 'due_date', 'priority', 'status']),
        ], 201);
    }

    // ─────────────────────────────────────────
    // PATCH /api/agent/tasks/{id}
    // ─────────────────────────────────────────
    public function updateTask(Request $request, $id)
    {
        $task = Task::where('id', $id)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        $request->validate([
            'title'       => 'sometimes|string|max:500',
            'due_date'    => 'sometimes|date',
            'priority'    => 'sometimes|in:low,medium,high',
            'description' => 'sometimes|nullable|string',
        ]);

        // Solo actualiza los campos que llegaron en el request
        $task->update($request->only(['title', 'due_date', 'priority', 'description']));

        return response()->json([
            'message' => 'Tarea actualizada correctamente',
            'task'    => $task->fresh()->only(['id', 'title', 'due_date', 'priority', 'status']),
        ]);
    }

    // ─────────────────────────────────────────
    // PATCH /api/agent/tasks/{id}/complete
    // ─────────────────────────────────────────
    public function completeTask(Request $request, $id)
    {
        $task = Task::where('id', $id)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        // Evita marcar como hecho algo ya completado
        if ($task->status === 'hecho') {
            return response()->json([
                'message' => 'Esta tarea ya estaba marcada como hecha',
                'task'    => $task->only(['id', 'title', 'status']),
            ]);
        }

        $task->update(['status' => 'hecho']);

        return response()->json([
            'message' => 'Tarea marcada como completada',
            'task'    => $task->fresh()->only(['id', 'title', 'due_date', 'status']),
        ]);
    }
}